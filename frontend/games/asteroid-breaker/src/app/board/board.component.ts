import { DOCUMENT } from "@angular/common";
import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  afterRenderEffect,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from "@angular/core";
import { count, formatPoints } from "@fz/core/format";
import { GameViewportService } from "@fz/game-ui/viewport";
import {
  KeepKeysDirective,
  PhaserCanvasComponent,
  type SceneSource,
} from "@fz/phaser/canvas";
import type { HostOptions } from "@fz/phaser/host";
import type { Insets } from "@fz/phaser/insets";
import {
  type CssRect,
  type Viewport,
  canvasPixelRatio,
} from "@fz/phaser/layout";
import { ThemeService } from "@fz/ui/theme";
import { whereLost } from "../../rules/describe";
import type { Torus } from "../../rules/torus";
import type { BeltSceneOptions } from "../../scene/belt_scene";
import type { Pictures } from "../../view/art";
import {
  type BoardSetting,
  fieldMetrics,
  fieldShape,
} from "../../view/field_metrics";
import { buzzOf } from "../../view/haptics";
import { tallyLines } from "../../view/tally";
import { PilotRowComponent } from "../pilot/pilot_row.component";
import { GameService } from "../play/game.service";
import { SettingsService } from "../settings/settings.service";
import { fieldPalette } from "./field_palette";

/** Names a card laid over the field, or none. */
type Card = "ready" | "paused" | "cleared" | "ended" | "slow" | "failed" | null;

/** The margin around the field on a compact screen and on a roomy one, in CSS pixels. */
const MARGIN_CSS_PX = { compact: 12, roomy: 24 } as const;

/**
 * Shows the board: the canvas the scene draws the field and the deck on,
 * which hears the keys, the mouse and fingers while the board has the focus,
 * a drawing of the empty field in CSS, where the scene will draw it, clear
 * of the deck's room, until the scene has drawn, and the cards that say how
 * to fly, that the wave is paused and who waits at home, how a wave cleared
 * added up, how to start again once an ended run's result is put away, that
 * the board is still loading on a slow connection, or that it couldn't be
 * drawn. It buzzes the phone, where it can and the settings say to, as a
 * ship is lost and as a wave is cleared.
 *
 * The board is an application to assistive technology, so a screen reader
 * hands it the keys rather than reading with them; the canvas in it is
 * hidden, and the announcer says what happens.
 */
@Component({
  selector: "app-board",
  imports: [KeepKeysDirective, PhaserCanvasComponent, PilotRowComponent],
  host: {
    tabindex: "0",
    role: "application",
    "aria-roledescription": "game board",
    "[attr.aria-label]": "label()",
    "aria-describedby": "board-keys",
    "[attr.data-field]": "fieldRect()",
    "[attr.data-outcome]": "game.outcome()",
    "[class.in-play]": "inPlay()",
    "[style.--margin.px]": "board().marginCss",
    "(pointerdown)": "takeFocus()",
  },
  templateUrl: "./board.component.html",
  styleUrl: "./board.component.scss",
})
export class BoardComponent {
  protected readonly game = inject(GameService);
  private readonly viewport = inject(GameViewportService);
  private readonly settings = inject(SettingsService).settings;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly canvas = viewChild.required(PhaserCanvasComponent);

  /**
   * The device pixels to a CSS pixel, as the canvas most often renders at,
   * so the placeholder lays the field out in whole device pixels as the
   * scene does.
   */
  private readonly pixelRatio = canvasPixelRatio(
    this.document.defaultView?.devicePixelRatio ?? 1,
  );

  /**
   * The settings the board lays the field and the deck out by, each a
   * signal of its own, so another setting changed lays nothing out again.
   */
  private readonly deckShowing = computed(() => this.settings().deck);
  private readonly stickOnRight = computed(() => this.settings().stickOnRight);
  private readonly fireByItself = computed(() => this.settings().fireByItself);

  /**
   * How the board lays the field and the deck out, as the settings say: the
   * deck where they have it show, on a touch screen unless they say
   * otherwise. Its margin is the stylesheet's too, which the cards keep.
   */
  protected readonly board = computed<BoardSetting>(() => {
    const deck = this.deckShowing();
    const stickOnRight = this.stickOnRight();
    const fireByItself = this.fireByItself();
    return {
      marginCss: this.viewport.isCompact()
        ? MARGIN_CSS_PX.compact
        : MARGIN_CSS_PX.roomy,
      deck:
        deck === "always" || (deck === "auto" && this.viewport.isTouchScreen()),
      stickOnRight,
      fireByItself,
    };
  });

  /** The canvas the board makes, as its size last changed, or null before it is measured. */
  private readonly room = signal<Viewport | null>(null);

  /** Names the board for the wave on it, as "Asteroid Breaker, wave 4: Thaw". */
  protected readonly label = computed(() => {
    const { number, data } = this.game.wave();
    return `Asteroid Breaker, wave ${String(number)}: ${data.name}`;
  });

  /** Whether a ship flies, over which the pointer marks where the mouse aims it. */
  protected readonly inPlay = computed(
    () => this.game.outcome() === "playing" && !this.game.waiting(),
  );

  /** Where the scene last laid the field out, in CSS pixels on the canvas. */
  private readonly laidOut = signal<CssRect | null>(null);

  /** The field's rectangle, for the layout check: x, y, width and height. */
  protected readonly fieldRect = computed(() => {
    const rect = this.laidOut();
    return rect && `${rect.x} ${rect.y} ${rect.width} ${rect.height}`;
  });

  /**
   * Where the field lies on the board, in CSS pixels: where the scene drew
   * it, or, until then, where it will, for the placeholder, the focus ring
   * and the cards; or null before the board is measured, where the
   * stylesheet fills the board.
   */
  protected readonly fieldStyle = computed(() => {
    const rect = this.laidOut() ?? this.placeholderField();
    return rect && rectStyle(rect);
  });

  /** The card over the field, if any. */
  protected readonly card = computed<Card>(() => {
    if (this.canvas().state() === "failed") return "failed";
    if (this.canvas().slow()) return "slow";
    switch (this.game.outcome()) {
      case "ready":
        return "ready";
      case "playing":
        return this.game.waiting() ? "ready" : null;
      case "paused":
        return "paused";
      case "cleared":
        return this.game.clearedOpen() ? "cleared" : null;
      case "over":
        return this.game.resultClosed() ? "ended" : null;
    }
  });

  /** What the Ready card calls the wave: its number and its name. */
  protected readonly waveTitle = computed(() => {
    const { number, data } = this.game.wave();
    return `Wave ${String(number)}: ${data.name}`;
  });

  /**
   * What the Ready card says flies the ship: the deck where it shows, its
   * stick on the side the settings say, else the keys; and how it fires.
   */
  protected readonly flyWords = computed(() => {
    const { deck, stickOnRight, fireByItself } = this.board();
    if (!deck) {
      return fireByItself
        ? "Arrows or W A D to fly; the ship fires by itself."
        : "Arrows or W A D to fly, Space to fire.";
    }
    const [stick, buttons] = stickOnRight
      ? ["right", "left"]
      : ["left", "right"];
    return fireByItself
      ? `Steer with the ${stick} pad; the ship fires by itself.`
      : `Steer with the ${stick} pad, fire with the ${buttons}.`;
  });

  /** The run's score, as the cards write it. */
  protected readonly score = computed(() => formatPoints(this.game.score()));

  /** The strays brought home, waiting to fly the next ships, as the Paused card draws them. */
  protected readonly home = computed(() => this.game.crew().home);

  /** Whether any stray waits at home, for the Paused card to draw. */
  protected readonly hasHome = computed(() => this.home().length > 0);

  /** What the Paused card says of the strays at home, since their pictures say nothing. */
  protected readonly homeWords = computed(
    () =>
      `${count(this.home().length, "fuzzball", "fuzzballs")} waiting at home`,
  );

  /** What the Cleared card calls the wave. */
  protected readonly clearedTitle = computed(
    () => `Wave ${String(this.game.wave().number)} cleared`,
  );

  /** What the Cleared card says goes on to the next wave, besides its button. */
  protected readonly nextWords = computed(
    () => `Move or fire for wave ${String(this.game.wave().number + 1)}.`,
  );

  /** How the wave just cleared added up, a line for each part, for its card. */
  protected readonly tallyLines = computed(() => {
    const tally = this.game.tally();
    return tally ? tallyLines(tally) : [];
  });

  /** What the card over an ended run calls it: the wave it was lost on. */
  protected readonly endTitle = computed(() => whereLost(this.game.run()));

  /** The field's colors, from the palette on the page. */
  private readonly palette = fieldPalette(inject(ThemeService));

  private readonly picturesState = signal<Pictures | null>(null);

  /**
   * The pictures of every rock kind, pickup, a stray and the comet as the
   * scene last drew them, for How to play, or null before it has drawn.
   */
  readonly pictures = this.picturesState.asReadonly();

  /** What the scene is handed: plain functions over the game. */
  private readonly sceneOptions: BeltSceneOptions = {
    tick: (deltaMs, steer) => {
      this.game.tick(deltaMs, steer);
    },
    frame: () => this.game.frame(),
    palette: () => this.palette(),
    motion: () => this.viewport.allowsMotion(),
    board: () => this.board(),
    onLayout: (viewport, field) => {
      this.game.setRoom(viewport, this.board());
      this.laidOut.set(field);
    },
    command: (command) => {
      this.game.command(command);
    },
    onPictures: (pictures) => {
      this.picturesState.set(pictures);
    },
  };

  /**
   * Loads the scene, and Phaser with it, only once the canvas asks, so the
   * shell paints first.
   */
  protected readonly scene: SceneSource = async () => {
    const { makeBeltScene } = await import("../../scene/belt_scene");
    return makeBeltScene(this.sceneOptions);
  };

  /**
   * Sets Phaser up for the board: keys heard only on the board's element,
   * the mouse and fingers for steering, the right button's menu kept shut,
   * as it thrusts, and nothing from a gamepad.
   */
  protected readonly hostOptions: HostOptions = {
    title: "Asteroid Breaker",
    // The page shows through until the scene draws, so nothing flashes.
    background: "transparent",
    config: {
      banner: false,
      autoFocus: false,
      disableContextMenu: true,
      render: {
        antialias: true,
        roundPixels: false,
        powerPreference: "low-power",
      },
      input: {
        keyboard: { target: this.host.nativeElement },
        mouse: true,
        touch: true,
        gamepad: false,
      },
      fps: { smoothStep: true },
    },
  };

  constructor() {
    // Nothing goes on before the scene that moves it is drawn. After
    // rendering, since the canvas's state needs the scene it is given.
    afterRenderEffect(() => {
      this.game.setDrawn(this.canvas().state() === "ready");
    });
    afterNextRender(() => {
      this.watchSize();
    });
    this.buzzAsTheRunChanges();
  }

  /** Puts the focus on the board after Angular's next render, as a run begins. */
  focus(options?: FocusOptions): void {
    afterNextRender(
      () => {
        this.host.nativeElement.focus(options);
      },
      { injector: this.injector },
    );
  }

  /** Goes on with the paused wave, and hands the focus back to the board. */
  protected resume(): void {
    this.game.resume();
    this.host.nativeElement.focus();
  }

  /** Goes on to the next wave, and hands the focus back to the board. */
  protected nextWave(): void {
    this.game.nextWave();
    this.host.nativeElement.focus();
  }

  /** Starts another run, from the card over an ended one. */
  protected newGame(): void {
    void this.game.newGame();
  }

  /** Loads the page again, for a board that couldn't be drawn. */
  protected reload(): void {
    this.document.defaultView?.location.reload();
  }

  /**
   * Takes the focus for a press on the board, which Phaser's pointer
   * otherwise keeps from it, so the keys work after a tap or a click.
   */
  protected takeFocus(): void {
    const board = this.host.nativeElement;
    if (!board.contains(this.document.activeElement)) {
      board.focus({ preventScroll: true });
    }
  }

  /** Buzzes the phone, where it can and the settings say to, as the run loses a ship and as it clears a wave. */
  private buzzAsTheRunChanges(): void {
    let last = this.game.run();
    effect(() => {
      const run = this.game.run();
      const buzz = buzzOf(last, run);
      last = run;
      const navigator = this.document.defaultView?.navigator;
      if (
        buzz &&
        this.settings().haptics &&
        typeof navigator?.vibrate === "function"
      ) {
        navigator.vibrate(buzz);
      }
    });
  }

  /** Returns the shape of the field the placeholder draws on a canvas: the one the scene will lay the waiting wave out in. */
  private shapeOn(room: Viewport): Torus {
    return fieldShape(room, this.board(), this.game.frame().field.torus);
  }

  /** Returns where the placeholder draws the field, in CSS pixels, or null before the board is measured. */
  private placeholderField(): CssRect | null {
    const room = this.room();
    return room && fieldMetrics(room, this.board(), this.shapeOn(room)).css;
  }

  /**
   * Measures the board each time its size changes, where the browser can
   * watch it, as the canvas the scene will lay the field out on.
   */
  private watchSize(): void {
    if (typeof ResizeObserver === "undefined") return;
    const board = this.host.nativeElement;
    const observer = new ResizeObserver(() => {
      this.room.set(this.canvasOf(board));
    });
    observer.observe(board);
    this.destroyRef.onDestroy(() => {
      observer.disconnect();
    });
  }

  /**
   * Returns the canvas a board's box makes, at the pixel ratio the
   * placeholder is drawn at, inside the insets its stylesheet declares for
   * the canvas, as the scene reads them.
   */
  private canvasOf(board: HTMLElement): Viewport {
    const { width, height } = board.getBoundingClientRect();
    const style = getComputedStyle(board);
    const inset = (edge: keyof Insets): number => {
      const value = parseFloat(
        style.getPropertyValue(`--fz-canvas-inset-${edge}`),
      );
      return Number.isFinite(value) ? value : 0;
    };
    return {
      width: Math.floor(width * this.pixelRatio),
      height: Math.floor(height * this.pixelRatio),
      pixelRatio: this.pixelRatio,
      insets: {
        top: inset("top"),
        right: inset("right"),
        bottom: inset("bottom"),
        left: inset("left"),
      },
    };
  }
}

/** Returns the styles that lay an element over a rectangle, in CSS pixels. */
function rectStyle(rect: CssRect): Record<string, string> {
  return {
    left: `${String(rect.x)}px`,
    top: `${String(rect.y)}px`,
    width: `${String(rect.width)}px`,
    height: `${String(rect.height)}px`,
  };
}
