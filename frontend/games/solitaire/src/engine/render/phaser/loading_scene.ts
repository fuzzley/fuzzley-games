import { Scene } from "phaser";
import { CardDeckId } from "../card_deck";
import { cardDeckAtlas } from "./card_deck_atlas";

/**
 * Scene responsible for preloading all necessary game assets and transitioning to the board scene.
 */
export class LoadingScene extends Scene {
  /**
   * Constructs the loading scene.
   *
   * @param deckId The deck to have ready before the board is shown. Only the
   *   one the player is using: the other is a couple of megabytes that most
   *   players never look at, and the board loads it on demand if they switch.
   */
  constructor(private readonly deckId: CardDeckId) {
    super("loading-scene");
  }

  /** Preloads the game asset textures and atlas configuration JSON. */
  preload() {
    const { textureKey, manifest } = cardDeckAtlas(this.deckId);

    // Phaser accepts an already-parsed manifest object here and only fetches
    // the page images from it, but types the parameter as a URL string.
    this.load.multiatlas(textureKey, manifest as unknown as string, undefined);
  }

  /** Automatically transitions to the main board scene once loading completes. */
  create() {
    this.scene.start("board-scene");
  }
}
