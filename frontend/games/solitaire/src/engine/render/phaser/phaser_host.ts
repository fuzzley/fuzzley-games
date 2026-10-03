import * as Phaser from "phaser";
import { Types } from "phaser";
import { BoardScene } from "./board_scene";
import { ScalableGame, ViewportScaler } from "./viewport_scaler";
import { DEFAULT_BACKGROUND_COLOR } from "../presentation";

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
  destroy(removeCanvas: boolean): void;
}

/** Builds the game a host runs from its configuration. */
export type CreateGame = (config: Types.Core.GameConfig) => HostedGame;

/** Hosts a Phaser canvas running whichever board it is given. */
export class PhaserHost {
  private game?: HostedGame;

  /** Keeps the canvas sized to the display's true pixel resolution. */
  private scaler?: ViewportScaler;

  /**
   * Creates a host that mounts a canvas into `parent` when started.
   *
   * @param makeBoardScene Builds the board to show.
   */
  constructor(
    private readonly window: Window,
    private readonly parent: HTMLElement,
    private readonly makeBoardScene: () => BoardScene,
    private readonly createGame: CreateGame = (config) =>
      new Phaser.Game(config),
  ) {}

  /** Starts the game. */
  public start(): void {
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
      // An instance, because Phaser cannot pass a scene its constructor
      // arguments.
      scene: [this.makeBoardScene()],
    };
    const game = this.createGame(gameConfig);
    this.game = game;

    // The scale manager and canvas only exist once the game has booted.
    game.events.once(Phaser.Core.Events.READY, () => {
      this.scaler = new ViewportScaler(this.window, game, this.parent);
      this.scaler.start();
    });
  }

  /**
   * Tears the game down, releasing the scaler's listeners, the canvas and its
   * WebGL context.
   */
  public destroy(): void {
    this.scaler?.stop();
    this.scaler = undefined;
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
