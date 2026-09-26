import { BoardScene } from "@/engine/render/phaser/board_scene";
import { TablePresentation } from "@/engine/render/presentation";
import { makeTableBoardScene } from "@/games/common/board_scene_factory";
import { stocklessGestures } from "@/games/common/table_gestures";
import { SEAHAVEN_LAYOUT } from "./seahaven_layout";
import { SeahavenGame } from "./seahaven_game";

/** Builds the Seahaven Towers board scene. */
export function makeSeahavenBoardScene(
  game: SeahavenGame,
  presentation: TablePresentation,
  onReady?: () => void,
): BoardScene {
  return makeTableBoardScene({
    game,
    layout: SEAHAVEN_LAYOUT,
    handleIntent: stocklessGestures(game),
    presentation,
    onReady,
  });
}
