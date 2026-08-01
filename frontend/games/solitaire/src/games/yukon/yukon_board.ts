import { BoardScene } from "@/engine/render/phaser/board_scene";
import { TablePresentation } from "@/engine/render/presentation";
import { makeTableBoardScene } from "@/games/common/board_scene_factory";
import { stocklessGestures } from "@/games/common/stockless_gestures";
import { YukonGame } from "./yukon_game";
import { YUKON_LAYOUT } from "./yukon_layout";

/**
 * Builds the Yukon board scene.
 *
 * The same grid for all three variants, and the shared stockless gestures
 * unchanged: with the whole deck dealt at the start there is nothing a single
 * press could draw or recycle.
 */
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
