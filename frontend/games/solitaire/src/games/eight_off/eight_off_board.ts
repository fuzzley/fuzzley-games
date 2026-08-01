import { BoardScene } from "@/engine/render/phaser/board_scene";
import { TablePresentation } from "@/engine/render/presentation";
import { makeTableBoardScene } from "@/games/common/board_scene_factory";
import { stocklessGestures } from "@/games/common/stockless_gestures";
import { EIGHT_OFF_LAYOUT } from "./eight_off_layout";
import { EightOffGame } from "./eight_off_game";

/**
 * Builds the Eight Off board scene.
 *
 * The whole board is dealt at the start, so the shared stockless gestures are
 * the right ones unchanged: a single press has nothing it could do.
 */
export function makeEightOffBoardScene(
  game: EightOffGame,
  presentation: TablePresentation,
): BoardScene {
  return makeTableBoardScene({
    game,
    layout: EIGHT_OFF_LAYOUT,
    handleIntent: stocklessGestures(game),
    presentation,
  });
}
