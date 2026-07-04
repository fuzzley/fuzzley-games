import { InjectionToken } from "@angular/core";
import { SolitaireGame } from "@/game/model/game/solitaire_game";
import { BoardScene } from "@/game/render/scene/board/board_scene";

/**
 * Injection token that provides the SolitaireGame model instance.
 *
 * The factory resolves the game model synchronously from the global
 * `window.solitaire` object. This works because `@/game/index` is imported
 * (and executed) before Angular bootstraps, and `gameModel` is a field
 * initializer on BoardScene — available before Phaser's `create()` runs.
 */
export const GAME_MODEL = new InjectionToken<SolitaireGame>("GAME_MODEL", {
  providedIn: "root",
  factory: () => {
    const game = window.solitaire?.game;
    const boardScene = game?.scene?.getScene("board-scene") as
      | BoardScene
      | undefined;
    if (!boardScene?.gameModel) {
      throw new Error("SolitaireGame model not available at injection time");
    }
    return boardScene.gameModel;
  },
});
