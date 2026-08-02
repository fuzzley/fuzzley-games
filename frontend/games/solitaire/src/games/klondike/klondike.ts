import { BoardScene } from "@/engine/render/phaser/board_scene";
import {
  buildKlondikeViewState,
  resolveKlondikeDropTarget,
} from "./klondike_board";
import { klondikeGestures, klondikeStackFromCard } from "./klondike_gestures";
import { KlondikeGame } from "./klondike_game";
import { KLONDIKE_LAYOUT } from "./klondike_layout";
import { TablePresentation } from "@/engine/render/presentation";

/**
 * Builds the board scene, wired to the shared Klondike game.
 *
 * Every decision the engine cannot make for itself is named here in one place:
 * which cards exist, which grid they lie on, what a press means, where a drop
 * lands, and how the board follows the player's choices.
 */
export function makeKlondikeBoardScene(
  game: KlondikeGame,
  presentation: TablePresentation,
  onReady?: () => void,
): BoardScene {
  return new BoardScene({
    game,
    cardIds: game.cardIds,
    layout: KLONDIKE_LAYOUT,
    buildViewState: buildKlondikeViewState(game, presentation),
    resolveDropTarget: resolveKlondikeDropTarget(game),
    handleIntent: klondikeGestures(game),
    stackFromCard: klondikeStackFromCard(game),
    cardBackKey: () => presentation.cardBackKey(),
    onBackgroundColor: presentation.onBackgroundColor,
    onReset: (listener) => {
      const handler = () => listener();
      game.on("game-reset", handler);
      return () => game.off("game-reset", handler);
    },
    onCardsRelocated: (listener) => game.onCardsRelocated(listener),
    onReady,
  });
}
