import { BoardScene } from "@/engine/render/phaser/board_scene";
import { TablePresentation } from "@/engine/render/presentation";
import { makeTableBoardScene } from "@/games/common/board_scene_factory";
import { FORTY_THIEVES_LAYOUT } from "./forty_thieves_layout";
import { FortyThievesGame } from "./forty_thieves_game";
import { fortyThievesGestures } from "./forty_thieves_gestures";

/**
 * Builds the Forty Thieves board scene.
 *
 * One board for all three of the family: they differ in what a column accepts,
 * what may be lifted from one and how much of the deal is buried — all of which
 * the zones already declare — and in nothing drawn.
 *
 * Forty Thieves writes its own gesture map rather than taking the shared
 * stockless one, because pressing its stock draws.
 */
export function makeFortyThievesBoardScene(
  game: FortyThievesGame,
  presentation: TablePresentation,
  onReady?: () => void,
): BoardScene {
  return makeTableBoardScene({
    game,
    layout: FORTY_THIEVES_LAYOUT,
    handleIntent: fortyThievesGestures(game),
    presentation,
    onReady,
  });
}
