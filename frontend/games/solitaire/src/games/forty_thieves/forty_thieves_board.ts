import { BoardScene } from "@/engine/render/phaser/board_scene";
import { TablePresentation } from "@/engine/render/presentation";
import { makeTableBoardScene } from "@/games/common/board_scene_factory";
import { fortyThievesLayout } from "./forty_thieves_layout";
import { FortyThievesGame } from "./forty_thieves_game";
import { fortyThievesGestures } from "./forty_thieves_gestures";

/**
 * Builds the board scene for any of the Forty Thieves family.
 *
 * The grid comes from the game's variant, since the variants differ in width
 * and a board factory is handed only the game.
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
