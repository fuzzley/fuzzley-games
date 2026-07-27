import { SolitaireGame } from "./solitaire_game";

let sharedGameModel: SolitaireGame | null = null;

/**
 * Returns the shared SolitaireGame instance, lazily creating and dealing it on
 * first call. Both the Angular UI and the Phaser board scene resolve the model
 * through this factory, so the model is created by whichever one references it
 * first and shared with the other, regardless of startup ordering.
 *
 * The first deal happens here rather than in the board scene: a renderer that
 * deals would throw away a game in progress every time its scene restarted, and
 * every consumer would otherwise have to know whether someone else had dealt yet.
 */
export function getGameModel(): SolitaireGame {
  if (!sharedGameModel) {
    sharedGameModel = new SolitaireGame();
    sharedGameModel.startNewGame();
  }
  return sharedGameModel;
}

/** Clears the shared instance so the next call creates a new one. Test-only. */
export function resetGameModel(): void {
  sharedGameModel = null;
}
