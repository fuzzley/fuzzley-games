import { DOCUMENT } from "@angular/common";
import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  afterRenderEffect,
  computed,
  inject,
  signal,
  viewChild,
} from "@angular/core";
import { GameViewportService } from "@fz/game-ui/viewport";
import {
  KeepKeysDirective,
  PhaserCanvasComponent,
  type SceneSource,
} from "@fz/phaser/canvas";
import type { HostOptions } from "@fz/phaser/host";
import type { Insets } from "@fz/phaser/insets";
import { type CssRect, canvasPixelRatio } from "@fz/phaser/layout";
import { ThemeService } from "@fz/ui/theme";
import { endTitle, formatPoints } from "../../rules/describe";
import { paddleTopOf } from "../../rules/paddle";
import {
  BRICKS_TOP,
  BRICK_HEIGHT,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  PADDLE_HEIGHT,
  PADDLE_TOP,
  PADDLE_WIDTH,
  ROWS,
} from "../../rules/tuning";
import type { BricksSceneOptions } from "../../scene/bricks_scene";
import type { Pictures } from "../../view/art";
import { fieldHeightFor, fingerRoomOf } from "../../view/field_metrics";
import { GameService } from "../play/game.service";
import { SettingsService } from "../settings/settings.service";
import { fieldPalette } from "./field_palette";

/** Names a card laid over the field, or none. */
type Card = "ready" | "paused" | "cleared" | "ended" | "slow" | "failed" | null;

/**
 * How far below the field's middle the Ready card sits, in field units:
 * halfway between the foot of the bricks' rows and the paddle, so it covers
 * neither as the player aims, the same on a taller field, whose paddle lies
 * as far above its floor. The other cards, which stand while nothing moves,
 * are taller than that gap and sit in the middle.
 */
const CARD_DROP =
  (BRICKS_TOP + ROWS * BRICK_HEIGHT + PADDLE_TOP) / 2 - FIELD_HEIGHT / 2;

/**
 * Shows the board: the canvas the scene draws the field on, which hears the
 * keys, the mouse and fingers while the board has the focus, a drawing of
 * the empty field in CSS until the scene has drawn, and the cards that say
 * how to launch, that the level is paused, how a level cleared added up,
 * how to start again once an ended run's result is put away, that the board
 * is still loading on a slow connection, or that it couldn't be drawn.
 *
 * The board is an application to assistive technology, so a screen reader
 * hands it the keys rather than reading with them; the canvas in it is
 * hidden, and the announcer says what happens.
 */
@Component({
  selector: "app-board",
  imports: [KeepKeysDirective, PhaserCanvasComponent],
  host: {
    tabindex: "0",
    role: "application",
    "aria-roledescription": "game board",
    "[attr.aria-label]": "label()",
    "aria-describedby": "board-keys",
    "[attr.data-field]": "fieldRect()",
    "[attr.data-outcome]": "game.outcome()",
    "[class.in-play]": "inPlay()",
    "[style.--across]": "across",
    "[style.--down]": "game.fieldHeight()",
    "[style.--finger-room]": "fingerRoom()",
    "[style.--card-drop]": "cardDrop",
    "[style.--pixel-ratio]": "pixelRatio",
    "(pointerdown)": "takeFocus()",
  },
  templateUrl: "./board.component.html",
  styleUrl: "./board.component.scss",
})
export class BoardComponent {
  protected readonly game = inject(GameService);
  private readonly viewport = inject(GameViewportService);
  private readonly settings = inject(SettingsService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly canvas = viewChild.required(PhaserCanvasComponent);

  protected readonly across = FIELD_WIDTH;
  protected readonly cardDrop = CARD_DROP;

  /** How tall a field the board has room for, which the game gives the field as its ball waits to be served. */
  private readonly roomFor = signal(FIELD_HEIGHT);

  /**
   * The room the board leaves under the field for a finger, in CSS pixels,
   * where it has room for a taller field: it follows the board, whose shape
   * changes at once, not the field, which waits for its ball to be served.
   */
  protected readonly fingerRoom = computed(() => fingerRoomOf(this.roomFor()));

  /** Where the placeholder draws the paddle, waiting in the middle, in field units. */
  protected readonly paddleStyle = computed(() => ({
    "--paddle-left": (FIELD_WIDTH - PADDLE_WIDTH) / 2,
    "--paddle-top": paddleTopOf(this.game.fieldHeight()),
    "--paddle-width": PADDLE_WIDTH,
    "--paddle-height": PADDLE_HEIGHT,
  }));

  /**
   * The device pixels to a CSS pixel, as the canvas most often renders at,
   * so the placeholder sizes its unit in whole device pixels as the scene
   * does.
   */
  protected readonly pixelRatio = canvasPixelRatio(
    this.document.defaultView?.devicePixelRatio ?? 1,
  );

  /** Names the board for the level on it, as "Brick Breaker, level 3: Pyramid". */
  protected readonly label = computed(() => {
    const { number, data } = this.game.level();
    return `Brick Breaker, level ${String(number)}: ${data.name}`;
  });

  /** Whether a ball is in play, over which the pointer is hidden. */
  protected readonly inPlay = computed(
    () => this.game.outcome() === "playing" && !this.game.serving(),
  );

  /** Where the scene last laid the field out, in CSS pixels on the canvas. */
  private readonly laidOut = signal<CssRect | null>(null);

  /** The field's rectangle, for the layout check: x, y, width and height. */
  protected readonly fieldRect = computed(() => {
    const rect = this.laidOut();
    return rect && `${rect.x} ${rect.y} ${rect.width} ${rect.height}`;
  });

  /**
   * Lays the focus ring around the field where the scene drew it, or where
   * the stylesheet works it out until then.
   */
  protected readonly ringStyle = computed(() => {
    const rect = this.laidOut();
    return (
      rect && {
        left: `${rect.x}px`,
        top: `${rect.y}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        margin: "0",
      }
    );
  });

  /** The card over the field, if any. */
  protected readonly card = computed<Card>(() => {
    if (this.canvas().state() === "failed") return "failed";
    if (this.canvas().slow()) return "slow";
    switch (this.game.outcome()) {
      case "ready":
        return "ready";
      case "playing":
        return this.game.serving() ? "ready" : null;
      case "paused":
        return "paused";
      case "cleared":
        return this.game.clearedOpen() ? "cleared" : null;
      case "over":
      case "won":
        return this.game.resultClosed() ? "ended" : null;
    }
  });

  /** What the Ready card calls the level: its number and its name. */
  protected readonly levelTitle = computed(() => {
    const { number, data } = this.game.level();
    return `Level ${String(number)}: ${data.name}`;
  });

  /** What the Ready card says launches the ball: a tap on a touch screen, else Space or a click. */
  protected readonly launchWords = computed(() =>
    this.viewport.isTouchScreen()
      ? "Tap to launch."
      : "Press Space or click to launch.",
  );

  /** The run's score, as the cards write it. */
  protected readonly score = computed(() => formatPoints(this.game.score()));

  /** What the Cleared card calls the level. */
  protected readonly clearedTitle = computed(
    () => `Level ${String(this.game.level().number)} cleared`,
  );

  /** How the level just cleared added up, a line for each part, for its card. */
  protected readonly tallyLines = computed(() => {
    const tally = this.game.tally();
    if (!tally) return [];
    return [
      { label: "Bricks", points: formatPoints(tally.bricks) },
      { label: "Streaks", points: formatPoints(tally.streaks) },
      { label: "Bonus", points: formatPoints(tally.bonus) },
    ];
  });

  /** What the card over an ended run calls it. */
  protected readonly endCardTitle = computed(() => endTitle(this.game.run()));

  /** The field's colors, from the palette on the page. */
  private readonly palette = fieldPalette(inject(ThemeService));

  private readonly picturesState = signal<Pictures | null>(null);

  /**
   * The pictures of every brick, ball and capsule as the scene last drew
   * them, for How to play, or null before it has drawn.
   */
  readonly pictures = this.picturesState.asReadonly();

  /** What the scene is handed: plain functions over the game. */
  private readonly sceneOptions: BricksSceneOptions = {
    tick: (deltaMs, steer) => {
      this.game.tick(deltaMs, steer);
    },
    frame: () => this.game.frame(),
    palette: () => this.palette(),
    motion: () => this.viewport.allowsMotion(),
    touch: () => this.settings.settings().touch,
    sound: () => this.settings.settings().sound,
    chimes: () => this.game.chimes(),
    fingerRoom: () => this.fingerRoom(),
    onLayout: (field) => {
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
    const { makeBricksScene } = await import("../../scene/bricks_scene");
    return makeBricksScene(this.sceneOptions);
  };

  /**
   * Sets Phaser up for the board: keys heard only on the board's element,
   * the mouse and fingers for steering, and nothing from a gamepad.
   */
  protected readonly hostOptions: HostOptions = {
    title: "Brick Breaker",
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
    // Nothing launches, or goes on, before the scene that moves it is drawn.
    // After rendering, since the canvas's state needs the scene it is given.
    afterRenderEffect(() => {
      this.game.setDrawn(this.canvas().state() === "ready");
    });
    afterNextRender(() => {
      this.watchSize();
    });
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

  /** Goes on with the paused level, and hands the focus back to the board. */
  protected resume(): void {
    this.game.resume();
    this.host.nativeElement.focus();
  }

  /** Goes on to the next level, and hands the focus back to the board. */
  protected nextLevel(): void {
    this.game.nextLevel();
    this.host.nativeElement.focus();
  }

  /** Starts another run, from the card over an ended one. */
  protected newGame(): void {
    void this.game.newGame();
  }

  /**
   * Works out how tall a field the board has room for each time its size
   * changes, where the browser can watch it, and asks the game for it.
   */
  private watchSize(): void {
    if (typeof ResizeObserver === "undefined") return;
    const board = this.host.nativeElement;
    const observer = new ResizeObserver(() => {
      const height = this.roomOf(board);
      this.roomFor.set(height);
      this.game.setFieldHeight(height);
    });
    observer.observe(board);
    this.destroyRef.onDestroy(() => {
      observer.disconnect();
    });
  }

  /**
   * Returns how tall a field the board has room for, in field units, inside
   * the insets its stylesheet declares for the canvas, as the scene reads
   * them, at the pixel ratio the placeholder is drawn at.
   */
  private roomOf(board: HTMLElement): number {
    const { width, height } = board.getBoundingClientRect();
    const style = getComputedStyle(board);
    const inset = (edge: keyof Insets): number => {
      const value = parseFloat(
        style.getPropertyValue(`--fz-canvas-inset-${edge}`),
      );
      return Number.isFinite(value) ? value : 0;
    };
    return fieldHeightFor({
      width: Math.floor(width * this.pixelRatio),
      height: Math.floor(height * this.pixelRatio),
      pixelRatio: this.pixelRatio,
      insets: {
        top: inset("top"),
        right: inset("right"),
        bottom: inset("bottom"),
        left: inset("left"),
      },
    });
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
}
