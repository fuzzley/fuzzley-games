import { BoardScene } from "@/engine/render/phaser/board_scene";
import { TablePresentation } from "@/engine/render/presentation";
import { makeTableBoardScene } from "@/games/common/board_scene_factory";
import { SPIDER_LAYOUT } from "./spider_layout";
import { SpiderGame } from "./spider_game";
import { spiderGestures } from "./spider_gestures";

/**
 * Builds the Spider board scene.
 *
 * Spider writes its own gesture map rather than taking the shared stockless
 * one, because pressing its stock deals a row.
 */
export function makeSpiderBoardScene(
  game: SpiderGame,
  presentation: TablePresentation,
): BoardScene {
  return makeTableBoardScene({
    game,
    layout: SPIDER_LAYOUT,
    handleIntent: spiderGestures(game),
    presentation,
  });
}
