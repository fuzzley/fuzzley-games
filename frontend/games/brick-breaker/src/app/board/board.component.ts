import { DOCUMENT } from "@angular/common";
import {
  Component,
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
import { type CssRect, canvasPixelRatio } from "@fz/phaser/layout";
import { ThemeService } from "@fz/ui/theme";
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
import { GameService } from "../play/game.service";
import { SettingsService } from "../settings/settings.service";
import { fieldPalette } from "./field_palette";

/** Names a card laid over the field, or none. */
type Card = "ready" | "paused" | "cleared" | "ended" | "slow" | "failed" | null;

/**
 * How far below the field's middle the Ready card sits, in field units:
 * halfway between the foot of the bricks' rows and the paddle, so it covers
 * neither as the player aims. The other cards, which stand while nothing
 * moves, are taller than that gap and sit in the middle.
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
    "[style.--down]": "down",
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
  private readonly canvas = viewChild.required(PhaserCanvasComponent);

  protected readonly across = FIELD_WIDTH;
  protected readonly down = FIELD_HEIGHT;
  protected readonly cardDrop = CARD_DROP;

  /** Where the placeholder draws the paddle, waiting in the middle, in field units. */
  protected readonly paddleStyle = {
    "--paddle-left": (FIELD_WIDTH - PADDLE_WIDTH) / 2,
    "--paddle-top": PADDLE_TOP,
    "--paddle-width": PADDLE_WIDTH,
    "--paddle-height": PADDLE_HEIGHT,
  };

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

  /** What the Cleared card calls the level. */
  protected readonly clearedTitle = computed(
    () => `Level ${String(this.game.level().number)} cleared`,
  );

  /** How the level just cleared added up, a line for each part, for its card. */
  protected readonly tallyLines = computed(() => {
    const tally = this.game.tally();
    if (!tally) return [];
    return [
      { label: "Bricks", points: tally.bricks },
      { label: "Streaks", points: tally.streaks },
      { label: "Bonus", points: tally.bonus },
    ];
  });

  /** What the card over an ended run calls it. */
  protected readonly endTitle = computed(() =>
    this.game.outcome() === "won" ? "Every level cleared!" : "Game over",
  );

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
