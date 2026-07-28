import * as Phaser from "phaser";
import { Types } from "phaser";
import { LoadingScene } from "@/engine/render/phaser/loading_scene";
import { BoardScene } from "@/engine/render/phaser/board_scene";
import {
  buildKlondikeViewState,
  resolveKlondikeDropTarget,
} from "./klondike_board";
import { getGameModel } from "./game_model_factory";
import { ViewportScaler } from "@/engine/render/phaser/viewport_scaler";
import { DEFAULT_BACKGROUND_COLOR } from "./game_settings";

/** Entry point to the game that loads assets and initializes the game. */
export class Solitaire {
  private game?: Phaser.Game;

  /** Keeps the canvas sized to the display's true pixel resolution. */
  private scaler?: ViewportScaler;

  /**
   * Constructs the Solitaire game entry point.
   *
   * @param window The browser Window context in which the game is running.
   * @param parent The element the game canvas is mounted into and sized to.
   *   Passed in rather than looked up by id so whoever owns the element owns
   *   the game's lifetime with it.
   */
  constructor(
    private readonly window: Window,
    private readonly parent: HTMLElement,
  ) {}

  /** Starts the game. */
  public start(): void {
    const gameConfig: Types.Core.GameConfig = {
      title: "fSolitaire",
      type: Phaser.AUTO,
      parent: this.parent,
      // Only shown for the frame or two before the board scene applies the
      // persisted setting, but it should still be the same green.
      backgroundColor: DEFAULT_BACKGROUND_COLOR,
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
      // A scene instance rather than the class: the board has to be told which
      // game it draws and how to lay it out, and Phaser cannot supply either.
      scene: [
        LoadingScene,
        new BoardScene(
          getGameModel(),
          buildKlondikeViewState,
          resolveKlondikeDropTarget,
        ),
      ],
    };
    const game = new Phaser.Game(gameConfig);
    this.game = game;

    // The scale manager and canvas only exist once the game has booted.
    game.events.once(Phaser.Core.Events.READY, () => {
      this.scaler = new ViewportScaler(this.window, game, this.parent);
      this.scaler.start();
    });
  }

  /**
   * Tears the game down, releasing the scaler's listeners and the canvas.
   *
   * Called by whoever started it when the element goes away, so a torn-down
   * host does not leave a game running against a detached canvas.
   */
  public destroy(): void {
    this.scaler?.stop();
    this.scaler = undefined;
    this.game?.destroy(true);
    this.game = undefined;
  }
}
