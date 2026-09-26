import * as Phaser from "phaser";
import { Types } from "phaser";
import { LoadingScene } from "./loading_scene";
import { BoardScene } from "./board_scene";
import { ViewportScaler } from "./viewport_scaler";
import { DEFAULT_BACKGROUND_COLOR, TablePresentation } from "../presentation";

/** Hosts a Phaser canvas running whichever board it is given. */
export class PhaserHost {
  private game?: Phaser.Game;

  /** Keeps the canvas sized to the display's true pixel resolution. */
  private scaler?: ViewportScaler;

  /**
   * Creates a host that mounts a canvas into `parent` when started.
   *
   * @param makeBoardScene Builds the board to show.
   * @param presentation How the player has asked the table to look, which the
   *   loading scene reads for the deck to fetch.
   */
  constructor(
    private readonly window: Window,
    private readonly parent: HTMLElement,
    private readonly makeBoardScene: () => BoardScene,
    private readonly presentation: TablePresentation,
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
      // Instances, because Phaser cannot pass a scene its constructor
      // arguments.
      scene: [new LoadingScene(this.presentation), this.makeBoardScene()],
    };
    const game = new Phaser.Game(gameConfig);
    this.game = game;

    // The scale manager and canvas only exist once the game has booted.
    game.events.once(Phaser.Core.Events.READY, () => {
      this.scaler = new ViewportScaler(this.window, game, this.parent);
      this.scaler.start();
    });
  }

  /** Tears the game down, releasing the scaler's listeners and the canvas. */
  public destroy(): void {
    this.scaler?.stop();
    this.scaler = undefined;
    this.game?.destroy(true);
    this.game = undefined;
  }
}
