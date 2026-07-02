import * as Phaser from "phaser";
import { Types } from "phaser";
import { LoadingScene } from "./render/scene/loading_scene";
import { BoardScene } from "./render/scene/board_scene";

/** Entry point to the game that loads assets and initializes the game. */
export class Solitaire {
  private game: Phaser.Game;

  /**
   * Constructs the Solitaire game entry point.
   *
   * @param window The browser Window context in which the game is running.
   */
  constructor(private readonly window: Window) {}

  /** Starts the game. */
  public start() {
    const gameConfig: Types.Core.GameConfig = {
      title: "fSolitaire",
      type: Phaser.AUTO,
      parent: "game",
      backgroundColor: "#0EB755",
      scale: {
        mode: Phaser.Scale.ScaleModes.RESIZE,
        autoCenter: Phaser.Scale.Center.CENTER_BOTH,
      },
      render: {
        antialias: true,
        roundPixels: true,
      },
      canvasStyle: `display: block; width: 100%; height: 100%;`,
      autoFocus: true,
      scene: [LoadingScene, BoardScene],
    };
    this.game = new Phaser.Game(gameConfig);
  }
}
