import { BoardScene } from "@/engine/render/phaser/board_scene";
import { TablePresentation } from "@/engine/render/presentation";
import { makeTableBoardScene } from "@/games/common/board_scene_factory";
import { fortyThievesLayout } from "./forty_thieves_layout";
import { FortyThievesGame } from "./forty_thieves_game";
import { fortyThievesGestures } from "./forty_thieves_gestures";

/**
 * Builds the board scene for any of the Forty Thieves family.
 *
 * One factory for all five, which is what lets three catalog entries share it.
 * The grid is read from the game's own variant rather than passed in, because a
 * board factory is handed only the game — and Maria and Limited sit on boards
 * of different widths from the three that share the ten-column grid.
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
    layout: fortyThievesLayout(game.variant),
    handleIntent: fortyThievesGestures(game),
    presentation,
    onReady,
  });
}
