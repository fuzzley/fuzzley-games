import * as Phaser from "phaser";
import { Types } from "phaser";
import { BoardScene } from "./board_scene";
import { ScalableGame, ViewportScaler } from "./viewport_scaler";
import { DEFAULT_BACKGROUND_COLOR } from "../presentation";
import { Insets, NO_INSETS } from "../layout/viewport";

/**
 * Describes the slice of `Phaser.Game` the host drives, so a spec need not boot
 * a real game.
 */
export interface HostedGame extends ScalableGame {
  /** The game's lifecycle events, for knowing when it has booted. */
  readonly events: { once(event: string, listener: () => void): unknown };
  /** The renderer, whose context the host releases; a canvas one has none. */
  readonly renderer: {
    readonly type: number;
    readonly gl?: WebGLRenderingContext;
  };
  /** The scene manager, which the host swaps boards in and out of. */
  readonly scene: {
    add(key: string, scene: BoardScene, autoStart: boolean): unknown;
    stop(key: string): unknown;
    remove(key: string): unknown;
  };
  destroy(removeCanvas: boolean): void;
}

/** Builds the game a host runs from its configuration. */
export type CreateGame = (config: Types.Core.GameConfig) => HostedGame;

/** Tells a board what the host knows of the page around its canvas. */
export interface BoardSurroundings {
  /**
   * Returns how far in from each edge the shell's chrome lies over the canvas,
   * in CSS pixels, as the canvas's parent declares it in `--board-inset-top`,
   * `-right`, `-bottom` and `-left`.
   */
  readonly insets: () => Insets;
}

/** Builds a board scene to run in a host. */
export type MakeBoardScene = (surroundings: BoardSurroundings) => BoardScene;

/**
 * Hosts one Phaser game, and so one WebGL context, for as long as it lives,
 * swapping in whichever board it is shown.
 *
 * Keeping the game means a new board reuses the context, its compiled shaders
 * and the deck already uploaded, and a browser never has to drop an old
 * context to make room for a new one.
 */
export class PhaserHost {
  private game?: HostedGame;

  /** Keeps the canvas sized to the display's true pixel resolution. */
  private scaler?: ViewportScaler;

  /** Whether the game has booted, after which a board is swapped in at once. */
  private booted = false;

  /** The board on the table. */
  private board?: BoardScene;

  /** Builds the board to mount once the game has booted. */
  private pendingBoard?: MakeBoardScene;

  /** Creates a host that mounts a canvas into `parent` when first shown a board. */
  constructor(
    private readonly window: Window,
    private readonly parent: HTMLElement,
    private readonly createGame: CreateGame = (config) =>
      new Phaser.Game(config),
  ) {}

  /**
   * Replaces the board on the table with the one `makeBoardScene` builds,
   * starting the game first if need be.
   *
   * A board shown before the game has booted replaces any other still waiting,
   * so only the latest is ever built.
   */
  public show(makeBoardScene: MakeBoardScene): void {
    this.pendingBoard = makeBoardScene;
    if (!this.game) {
      this.start();
    } else if (this.booted) {
      this.mountPendingBoard();
    }
  }

  /** Starts the game, which mounts the waiting board once it has booted. */
  private start(): void {
    const gameConfig: Types.Core.GameConfig = {
      title: "fSolitaire",
      type: Phaser.AUTO,
      parent: this.parent,
      // Shown only until the board applies the player's colour.
      backgroundColor: DEFAULT_BACKGROUND_COLOR,
      scale: {
        // ViewportScaler sizes the canvas in device pixels; every built-in mode
        // would use CSS pixels.
        mode: Phaser.Scale.ScaleModes.NONE,
      },
      render: {
        antialias: true,
        roundPixels: true,
      },
      canvasStyle: `display: block; width: 100%; height: 100%;`,
      autoFocus: true,
    };
    const game = this.createGame(gameConfig);
    this.game = game;

    // The scale manager and canvas only exist once the game has booted.
    game.events.once(Phaser.Core.Events.READY, () => {
      // A game destroyed while booting may still finish booting.
      if (this.game !== game) return;
      this.booted = true;
      this.scaler = new ViewportScaler(this.window, game, this.parent);
      this.scaler.start();
      this.mountPendingBoard();
    });
  }

  /** Swaps the waiting board in for the one on the table. */
  private mountPendingBoard(): void {
    const scenes = this.game?.scene;
    const makeBoardScene = this.pendingBoard;
    if (!scenes || !makeBoardScene) return;
    this.pendingBoard = undefined;

    if (this.board) {
      // Stopped before it is removed, because removing a scene destroys it
      // without shutting it down.
      scenes.stop(this.board.key);
      scenes.remove(this.board.key);
    }
    const board = makeBoardScene({
      insets: () => this.scaler?.insets ?? NO_INSETS,
    });
    this.board = board;
    scenes.add(board.key, board, true);
  }

  /**
   * Reads again how far in the chrome lies over each edge of the canvas, for
   * chrome that moved without the window changing size, such as a rail that
   * changed sides. The board lays itself out inside the new insets on its next
   * frame, its cards easing there as after any move.
   */
  public refreshInsets(): void {
    this.scaler?.refreshInsets();
  }

  /**
   * Tears the game down, releasing the scaler's listeners, the canvas and its
   * WebGL context.
   */
  public destroy(): void {
    this.scaler?.stop();
    this.scaler = undefined;
    this.board = undefined;
    this.pendingBoard = undefined;
    this.booted = false;
    const game = this.game;
    if (!game) return;
    this.game = undefined;

    // Phaser leaves the context for the garbage collector, and a browser caps
    // how many it keeps alive. Released from Phaser's own teardown, which runs
    // on the next frame, because its renderer warns of a lost context until
    // then.
    game.events.once(Phaser.Core.Events.DESTROY, () => {
      game.renderer?.gl?.getExtension("WEBGL_lose_context")?.loseContext();
    });
    game.destroy(true);
  }
}
