import { SolitaireGame } from "./solitaire_game";

let sharedGameModel: SolitaireGame | null = null;

/**
 * Returns the shared SolitaireGame instance, lazily creating it on first
 * call. Both the Angular UI and the Phaser board scene resolve the model
 * through this factory, so whichever one initializes first creates the
 * instance and the other reuses it, removing any dependency on startup
 * ordering between the two.
 */
export function getGameModel(): SolitaireGame {
  if (!sharedGameModel) {
    sharedGameModel = new SolitaireGame();
  }
  return sharedGameModel;
}

/** Clears the shared instance so the next call creates a new one. Test-only. */
export function resetGameModel(): void {
  sharedGameModel = null;
}
