import { BoardScene } from "@/engine/render/phaser/board_scene";
import { TablePresentation } from "@/engine/render/presentation";
import { makeTableBoardScene } from "@/games/common/board_scene_factory";
import { stocklessGestures } from "@/games/common/table_gestures";
import { BAKERS_DOZEN_LAYOUT } from "./bakers_dozen_layout";
import { BakersDozenGame } from "./bakers_dozen_game";

/** Builds the Baker's Dozen board scene. */
export function makeBakersDozenBoardScene(
  game: BakersDozenGame,
  presentation: TablePresentation,
  onReady?: () => void,
): BoardScene {
  return makeTableBoardScene({
    game,
    layout: BAKERS_DOZEN_LAYOUT,
    handleIntent: stocklessGestures(game),
    presentation,
    onReady,
  });
}
