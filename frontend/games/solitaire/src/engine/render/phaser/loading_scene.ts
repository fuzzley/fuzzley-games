import { Scene } from "phaser";
import { TablePresentation } from "../presentation";
import { loadCardDeck } from "./card_deck_atlas";

/** Loads the deck the player chose, then starts the board scene. */
export class LoadingScene extends Scene {
  /**
   * Creates the scene.
   *
   * @param presentation Names the one deck to load; the board loads another
   *   only if the player switches.
   */
  constructor(private readonly presentation: TablePresentation) {
    super("loading-scene");
  }

  /** Queues the chosen deck's atlas. */
  preload() {
    loadCardDeck(this.load, this.presentation.cardDeckId());
  }

  /** Starts the board scene once loading completes. */
  create() {
    this.scene.start("board-scene");
  }
}
