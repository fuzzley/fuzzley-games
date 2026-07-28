import { InjectionToken } from "@angular/core";
import { SolitaireGame } from "@/games/klondike/solitaire_game";

/**
 * The Klondike game the application plays.
 *
 * Angular owns its lifetime now: the model used to come from a module-level
 * singleton so the Phaser scene and the Angular UI could find each other
 * whichever booted first, which also meant exactly one game could ever exist.
 * The board is now handed its game when it is built, so there is nothing left
 * for a singleton to reconcile.
 */
export const GAME_MODEL = new InjectionToken<SolitaireGame>("GAME_MODEL", {
  providedIn: "root",
  factory: () => {
    const game = new SolitaireGame();
    // Dealt here rather than by the renderer: a scene that dealt would throw
    // away a game in progress every time it restarted.
    game.startNewGame();
    return game;
  },
});
