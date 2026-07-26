import * as Phaser from "phaser";
import { Types } from "phaser";
import { LoadingScene } from "./render/scene/loading/loading_scene";
import { BoardScene } from "./render/scene/board/board_scene";
import { ViewportScaler } from "./render/scale/viewport_scaler";

/** The id of the element the game canvas is mounted into. */
const GAME_PARENT_ID = "game";

/** Entry point to the game that loads assets and initializes the game. */
export class Solitaire {
  public game: Phaser.Game;

  /** Keeps the canvas sized to the display's true pixel resolution. */
  public scaler: ViewportScaler;

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
      parent: GAME_PARENT_ID,
      backgroundColor: "#0f4d0e",
      scale: {
        // NONE, because every built-in mode sizes the canvas backing store in
        // CSS pixels. ViewportScaler drives the size instead so the canvas
        // rasterizes at the display's device resolution.
        mode: Phaser.Scale.ScaleModes.NONE,
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

    // The scale manager and canvas only exist once the game has booted.
    this.game.events.once(Phaser.Core.Events.READY, () => {
      const parent = this.window.document.getElementById(GAME_PARENT_ID);
      if (!parent) {
        throw new Error(`Game parent element #${GAME_PARENT_ID} not found`);
      }
      this.scaler = new ViewportScaler(this.window, this.game, parent);
      this.scaler.start();
    });
  }
}
