import { BoardScene } from "@/engine/render/phaser/board_scene";
import { TablePresentation } from "@/engine/render/presentation";
import { makeTableBoardScene } from "@/games/common/board_scene_factory";
import { stocklessGestures } from "@/games/common/table_gestures";
import { YukonGame } from "./yukon_game";
import { YUKON_LAYOUT } from "./yukon_layout";

/** Builds the Yukon board scene, which is the same for all three variants. */
export function makeYukonBoardScene(
  game: YukonGame,
  presentation: TablePresentation,
  onReady?: () => void,
): BoardScene {
  return makeTableBoardScene({
    game,
    layout: YUKON_LAYOUT,
    handleIntent: stocklessGestures(game),
    presentation,
    onReady,
  });
}
