import { InjectionToken } from "@angular/core";
import { SolitaireGame } from "@/game/model/game/solitaire_game";
import { getGameModel } from "@/game/model/game/game_model_factory";

/**
 * Injection token that provides the shared SolitaireGame model instance.
 *
 * Resolves via the same lazy factory the Phaser board scene uses, so the
 * model is created by whichever side references it first and shared with
 * the other, regardless of Angular/Phaser startup ordering.
 */
export const GAME_MODEL = new InjectionToken<SolitaireGame>("GAME_MODEL", {
  providedIn: "root",
  factory: () => getGameModel(),
});
