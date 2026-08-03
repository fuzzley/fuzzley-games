import { Scene } from "phaser";
import { TablePresentation } from "../presentation";
import { loadCardDeck } from "./card_deck_atlas";

/**
 * Scene responsible for preloading all necessary game assets and transitioning to the board scene.
 */
export class LoadingScene extends Scene {
  /**
   * Constructs the loading scene.
   *
   * @param presentation How the player has asked the table to look, read for
   *   the deck to have ready before the board is shown. Only the one they are
   *   using: each of the others is a couple of megabytes that most players
   *   never look at, and the board loads one on demand if they switch.
   */
  constructor(private readonly presentation: TablePresentation) {
    super("loading-scene");
  }

  /** Preloads the game asset textures and atlas configuration JSON. */
  preload() {
    loadCardDeck(this.load, this.presentation.cardDeckId());
  }

  /** Automatically transitions to the main board scene once loading completes. */
  create() {
    this.scene.start("board-scene");
  }
}
