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
  untracked,
  viewChild,
} from "@angular/core";
import { GameViewportService } from "@fz/game-ui/viewport";
import { PhaserCanvasComponent, type SceneSource } from "@fz/phaser/canvas";
import type { HostOptions } from "@fz/phaser/host";
import type { Insets } from "@fz/phaser/insets";
import {
  type CssRect,
  type Viewport,
  canvasPixelRatio,
} from "@fz/phaser/layout";
import { ThemeService } from "@fz/ui/theme";
import type { Torus } from "../../rules/torus";
import type { BeltSceneOptions } from "../../scene/belt_scene";
import type { Pictures } from "../../view/art/art";
import { buzzOf } from "../../view/effects/haptics";
import {
  type BoardSetting,
  type PixelRect,
  deckLayout,
  fieldMetrics,
  fieldShape,
} from "../../view/field/field_metrics";
import { GameService } from "../play/game.service";
import { SettingsService } from "../settings/settings.service";
import { BoardCardComponent } from "./board_card.component";
import { fieldPalette } from "./field_palette";

/** The margin around the field on a compact screen and on a roomy one, in CSS pixels. */
const MARGIN_CSS_PX = { compact: 12, roomy: 24 } as const;

/**
 * Shows the board: the canvas the scene draws the field and the deck on,
 * which hears the keys, the mouse and fingers while the board has the focus,
 * a drawing of the empty field in CSS, where the scene will draw it, clear
 * of the deck's room, until the scene has drawn, and the card over the
 * field (`<app-board-card>`), told where the scene is and how the ship
 * flies. It buzzes the phone, where it can and the settings say to, as a
 * ship is lost and as a wave is cleared.
 *
 * The board is an application to assistive technology, so a screen reader
 * hands it the keys rather than reading with them; the canvas in it is
 * hidden, and the announcer says what happens.
 */
@Component({
  selector: "app-board",
  imports: [BoardCardComponent, PhaserCanvasComponent],
  host: {
    tabindex: "0",
    role: "application",
    "aria-roledescription": "game board",
    "[attr.aria-label]": "label()",
    "aria-describedby": "board-keys",
    "[attr.data-field]": "fieldRect()",
    "[attr.data-room]": "roomRect()",
    "[attr.data-deck]": "deckZones()",
    "[style.--across]": "laid()?.torus.width",
    "[style.--down]": "laid()?.torus.height",
    "[style.--pixel-ratio]": "pixelRatio",
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
  protected readonly canvas = viewChild.required(PhaserCanvasComponent);

  /**
   * The device pixels to a CSS pixel, as the canvas most often renders at,
   * so the placeholder lays the field out in whole device pixels as the
   * scene does.
   */
  protected readonly pixelRatio = canvasPixelRatio(
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
  protected readonly inPlay = computed(() => this.game.outcome() === "playing");

  /** How the scene last laid the field and the deck out, or null before it has. */
  protected readonly laid = signal<Laid | null>(null);

  /** The field's rectangle, for the layout check: x, y, width and height. */
  protected readonly fieldRect = computed(() => {
    const field = this.laid()?.field;
    return field ? rectWords(field) : null;
  });

  /**
   * The room the field fills inside its frame, for the layout check, written as
   * the field's rectangle is.
   */
  protected readonly roomRect = computed(() => {
    const room = this.laid()?.room;
    return room ? rectWords(room) : null;
  });

  /**
   * Where the deck's zones lie, for the layout check: each by its name and
   * its rectangle, as "stick x y width height, buttons x y width height";
   * or null where the deck doesn't show.
   */
  protected readonly deckZones = computed(() => {
    const deck = this.laid()?.deck;
    return deck
      ? `stick ${rectWords(deck.stick)}, buttons ${rectWords(deck.buttons)}`
      : null;
  });

  /**
   * Where the field lies on the board, in CSS pixels: where the scene drew
   * it, or, until then, where it will, for the placeholder, the focus ring
   * and the cards; or null before the board is measured, where the
   * stylesheet fills the board.
   */
  protected readonly fieldStyle = computed(() => {
    const rect = this.laid()?.field ?? this.placeholderField();
    return rect && rectStyle(rect);
  });

  /** The field's colors, from the palette on the page. */
  private readonly palette = fieldPalette(inject(ThemeService));

  /** Asks the scene for its pictures of the atlas it last baked, or null before it has baked. */
  private readonly askPictures = signal<(() => Pictures) | null>(null);

  /**
   * The pictures of every rock kind, pickup, a stray and the comet as the
   * scene last drew them, for How to play, or null before it has drawn.
   *
   * The scene encodes them as this is first read after each bake, so only
   * How to play reads it, as it opens.
   */
  readonly pictures = computed(() => this.askPictures()?.() ?? null);

  /** What the scene is handed: plain functions over the game. */
  private readonly sceneOptions: BeltSceneOptions = {
    tick: (deltaMs, steer) => {
      this.game.tick(deltaMs, steer);
    },
    frame: () => this.game.frame(),
    palette: () => this.palette(),
    motion: () => this.viewport.allowsMotion(),
    sound: () => this.settings().sound,
    thrusting: () => this.game.thrusting(),
    board: () => this.board(),
    onLayout: (viewport, field) => {
      const board = this.board();
      // The shape the scene laid out, before the room reshapes the field.
      const { torus } = this.game.frame().field;
      const css = (rect: PixelRect): CssRect =>
        inCss(rect, viewport.pixelRatio);
      const deck = deckLayout(viewport, board, torus);
      this.laid.set({
        field,
        room: css(fieldMetrics(viewport, board, torus).room),
        torus,
        deck: deck && { stick: css(deck.stick), buttons: css(deck.buttons) },
      });
      this.game.setRoom(viewport, board);
    },
    command: (command) => {
      this.game.command(command);
    },
    onPictures: (pictures) => {
      this.askPictures.set(pictures);
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
    this.shapeForTheRoom();
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

  /**
   * Takes the focus back as the player goes on from a card, whose button
   * held it and goes with the card.
   */
  protected takeFocusBack(): void {
    this.host.nativeElement.focus();
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

  /**
   * Hands the game the room the board measures until the scene lays the
   * field out, so the field the scene first draws is the one the
   * placeholder drew, not the shape it had, which it would draw for a
   * frame before the scene's own room reshaped it. Where the canvas the
   * scene measures differs from the board by a pixel, the scene's room
   * then reshapes it by a fraction of a unit.
   */
  private shapeForTheRoom(): void {
    effect(() => {
      const room = this.room();
      if (!room || this.laid()) return;
      const board = this.board();
      untracked(() => {
        this.game.setRoom(room, board);
      });
    });
  }

  /**
   * Buzzes the phone, where it can and the settings say to, as the run loses a
   * ship and as it clears a wave.
   */
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

  /**
   * Returns the shape of the field the placeholder draws on a canvas: the one
   * the scene will lay the waiting wave out in.
   */
  private shapeOn(room: Viewport): Torus {
    return fieldShape(room, this.board(), this.game.frame().field.torus);
  }

  /**
   * Returns where the placeholder draws the field, in CSS pixels, or null
   * before the board is measured.
   */
  private placeholderField(): CssRect | null {
    const room = this.room();
    return room && fieldMetrics(room, this.board(), this.shapeOn(room)).css;
  }

  /**
   * Measures the board as it is first drawn, then each time its size
   * changes, where the browser can watch it, as the canvas the scene will
   * lay the field out on.
   */
  private watchSize(): void {
    if (typeof ResizeObserver === "undefined") return;
    const board = this.host.nativeElement;
    // The browser first reports the size after a paint, which would show
    // the cards over the whole board for a frame before the field.
    this.room.set(this.canvasOf(board));
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

/**
 * Says how the scene last laid the field and the deck out, its rectangles in
 * CSS pixels on the canvas.
 */
interface Laid {
  /** Where the field lies, inside its frame. */
  readonly field: CssRect;
  /** The room the field fills, inside its frame. */
  readonly room: CssRect;
  /** The field's shape, in its units. */
  readonly torus: Torus;
  /** Where the deck's zones lie, or null where the deck doesn't show. */
  readonly deck: DeckZones | null;
}

/** Says where the deck's zones lie, in CSS pixels on the canvas. */
interface DeckZones {
  readonly stick: CssRect;
  readonly buttons: CssRect;
}

/** Returns a rectangle on the canvas in CSS pixels, given in device pixels at a pixel ratio. */
function inCss(
  { x, y, width, height }: PixelRect,
  pixelRatio: number,
): CssRect {
  return {
    x: x / pixelRatio,
    y: y / pixelRatio,
    width: width / pixelRatio,
    height: height / pixelRatio,
  };
}

/** Returns a rectangle as the layout check reads one: "x y width height". */
function rectWords({ x, y, width, height }: CssRect): string {
  return `${String(x)} ${String(y)} ${String(width)} ${String(height)}`;
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
