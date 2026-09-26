import { BoardScene } from "@/engine/render/phaser/board_scene";
import { TablePresentation } from "@/engine/render/presentation";
import { makeTableBoardScene } from "@/games/common/board_scene_factory";
import { stocklessGestures } from "@/games/common/table_gestures";
import { FREECELL_LAYOUT } from "./freecell_layout";
import { FreeCellGame } from "./freecell_game";

/** Builds the FreeCell board scene. */
export function makeFreeCellBoardScene(
  game: FreeCellGame,
  presentation: TablePresentation,
  onReady?: () => void,
): BoardScene {
  return makeTableBoardScene({
    game,
    layout: FREECELL_LAYOUT,
    handleIntent: stocklessGestures(game),
    presentation,
    onReady,
  });
}
