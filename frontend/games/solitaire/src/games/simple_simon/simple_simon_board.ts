import { BoardScene } from "@/engine/render/phaser/board_scene";
import { TablePresentation } from "@/engine/render/presentation";
import { makeTableBoardScene } from "@/games/common/board_scene_factory";
import { stocklessGestures } from "@/games/common/stockless_gestures";
import { SIMPLE_SIMON_LAYOUT } from "./simple_simon_layout";
import { SimpleSimonGame } from "./simple_simon_game";

/**
 * Builds the Simple Simon board scene.
 *
 * The whole board is dealt at the start, so the shared stockless gestures are
 * the right ones unchanged: there is no stock for a single press to draw from.
 */
export function makeSimpleSimonBoardScene(
  game: SimpleSimonGame,
  presentation: TablePresentation,
  onReady?: () => void,
): BoardScene {
  return makeTableBoardScene({
    game,
    layout: SIMPLE_SIMON_LAYOUT,
    handleIntent: stocklessGestures(game),
    presentation,
    onReady,
  });
}
