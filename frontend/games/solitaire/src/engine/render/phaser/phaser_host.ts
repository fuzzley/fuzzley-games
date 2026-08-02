import * as Phaser from "phaser";
import { Types } from "phaser";
import { LoadingScene } from "./loading_scene";
import { BoardScene } from "./board_scene";
import { ViewportScaler } from "./viewport_scaler";
import { DEFAULT_BACKGROUND_COLOR } from "../presentation";

/**
 * Hosts a Phaser canvas running whichever board it is given.
 *
 * Knows nothing about any particular solitaire: it is handed a factory for the
 * board to show and mounts a canvas around it. It lived in the Klondike module
 * and was called `Klondike` for as long as Klondike was the only game, which
 * left the Angular shell importing `games/klondike` in order to run Spider.
 */
export class PhaserHost {
  private game?: Phaser.Game;

  /** Keeps the canvas sized to the display's true pixel resolution. */
  private scaler?: ViewportScaler;

  /**
   * @param window The browser Window context in which the game is running.
   * @param parent The element the game canvas is mounted into and sized to.
   *   Passed in rather than looked up by id so whoever owns the element owns
   *   the game's lifetime with it.
   * @param makeBoardScene Builds the board to show. Handed in so the host can
   *   run any game the engine can build, rather than importing one.
   */
  constructor(
    private readonly window: Window,
    private readonly parent: HTMLElement,
    private readonly makeBoardScene: () => BoardScene,
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
      scene: [LoadingScene, this.makeBoardScene()],
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
