import { DOCUMENT } from "@angular/common";
import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  afterRenderEffect,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from "@angular/core";
import { GameViewportService } from "@fz/game-ui/viewport";
import { PhaserCanvasComponent, type SceneSource } from "@fz/phaser/canvas";
import type { HostOptions } from "@fz/phaser/host";
import type { CssRect } from "@fz/phaser/layout";
import { ThemeService } from "@fz/ui/theme";
import { BOARD_SIZE } from "../../rules/arena";
import type { SnakeSceneOptions } from "../../scene/snake_scene";
import { snakePalette } from "../../view/palette";
import { GameService } from "../play/game.service";
import { SettingsService } from "../settings/settings.service";

/** Names a card laid over the board, or none. */
type Card = "start" | "paused" | "ended" | "slow" | "failed" | null;

/**
 * Shows the board: the canvas the scene draws on, which hears the keys and
 * the swipes while the board has the focus, a drawing of the empty board in
 * CSS until the scene has drawn, and the cards that say how to start, that
 * the run is paused, how to start again once its result is put away, that
 * the board is still loading on a slow connection, or that it couldn't be
 * drawn.
 *
 * The board is an application to assistive technology, so a screen reader
 * hands it the arrow keys rather than reading with them; the canvas in it is
 * hidden, and the announcer says what happens.
 */
@Component({
  selector: "app-board",
  imports: [PhaserCanvasComponent],
  host: {
    tabindex: "0",
    role: "application",
    "aria-roledescription": "game board",
    "[attr.aria-label]": "label",
    "aria-describedby": "board-keys",
    "[attr.data-board]": "boardRect()",
    "[attr.data-outcome]": "game.outcome()",
    "[style.--squares]": "squares",
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
  private readonly theme = inject(ThemeService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly canvas = viewChild.required(PhaserCanvasComponent);

  /** Whether the on-screen arrows show beside the board. */
  readonly arrows = input(false);

  protected readonly squares = BOARD_SIZE;
  protected readonly label = `Snake, ${BOARD_SIZE} by ${BOARD_SIZE}`;

  /**
   * The device pixels to a CSS pixel, as the canvas most often renders at,
   * so the placeholder sizes its squares in whole device pixels as the scene
   * does.
   */
  protected readonly pixelRatio = Math.min(
    this.document.defaultView?.devicePixelRatio ?? 1,
    3,
  );

  /** Where the scene last laid the board out, in CSS pixels on the canvas. */
  private readonly laidOut = signal<CssRect | null>(null);

  /** The board's rectangle, for the layout check: x, y, width and height. */
  protected readonly boardRect = computed(() => {
    const rect = this.laidOut();
    return rect && `${rect.x} ${rect.y} ${rect.width} ${rect.height}`;
  });

  /**
   * Lays the focus ring around the board where the scene drew it, or where
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

  /** The card over the board, if any. */
  protected readonly card = computed<Card>(() => {
    if (this.canvas().state() === "failed") return "failed";
    if (this.canvas().slow()) return "slow";
    switch (this.game.outcome()) {
      case "ready":
        return "start";
      case "paused":
        return "paused";
      case "over":
      case "won":
        return this.game.resultClosed() ? "ended" : null;
      default:
        return null;
    }
  });

  /**
   * What the card says starts a run: the swipe and the arrows, as there are
   * on a touch screen, or the keys too.
   */
  protected readonly startWords = computed(() => {
    if (!this.viewport.isTouchScreen()) {
      return "Press an arrow key, or swipe, to start.";
    }
    return this.arrows()
      ? "Swipe, or press an arrow, to start."
      : "Swipe to start.";
  });

  /** What the card over an ended run calls it, as the result card does. */
  protected readonly endTitle = computed(() =>
    this.game.outcome() === "won" ? "You filled the board!" : "Game over",
  );

  /** The board's colors, a new object only when the palette changes. */
  private readonly palette = computed(() =>
    snakePalette({
      panel: this.panel(),
      text: this.text(),
      accent: this.accent(),
      danger: this.danger(),
    }),
  );
  private readonly panel = this.theme.role("panel");
  private readonly text = this.theme.role("text");
  private readonly accent = this.theme.role("accent");
  private readonly danger = this.theme.role("danger");

  /** What the scene is handed: plain functions over the game. */
  private readonly sceneOptions: SnakeSceneOptions = {
    tick: (deltaMs) => {
      this.game.tick(deltaMs);
    },
    frame: () => this.game.frame(),
    palette: () => this.palette(),
    motion: () => this.viewport.allowsMotion(),
    sound: () => this.settings.settings().sound,
    onLayout: (board) => {
      this.laidOut.set(board);
    },
    command: (command) => {
      this.game.command(command);
    },
  };

  /**
   * Loads the scene, and Phaser with it, only once the canvas asks, so the
   * shell paints first.
   */
  protected readonly scene: SceneSource = async () => {
    const { makeSnakeScene } = await import("../../scene/snake_scene");
    return makeSnakeScene(this.sceneOptions);
  };

  /**
   * Sets Phaser up for the board: keys heard only on the board's element,
   * the pointer for swipes, and nothing from a gamepad.
   */
  protected readonly hostOptions: HostOptions = {
    title: "Snake",
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
    // A run can't start, or go on, before the scene that moves it is drawn.
    // After rendering, since the canvas's state needs the scene it is given.
    afterRenderEffect(() => {
      this.game.setDrawn(this.canvas().state() === "ready");
    });
  }

  /** Puts the focus on the board once it has drawn, as a run begins. */
  focus(options?: FocusOptions): void {
    afterNextRender(
      () => {
        this.host.nativeElement.focus(options);
      },
      { injector: this.injector },
    );
  }

  /** Goes on with the paused run, and hands the focus back to the board. */
  protected resume(): void {
    this.game.resume();
    this.host.nativeElement.focus();
  }

  /** Keeps a key pressed or let go on a card's button from the board's keys, so the button takes it. */
  protected keepKey(event: KeyboardEvent): void {
    event.stopPropagation();
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
