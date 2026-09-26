import { BoardScene } from "@/engine/render/phaser/board_scene";
import { TablePresentation } from "@/engine/render/presentation";
import { makeTableBoardScene } from "@/games/common/board_scene_factory";
import { SPIDERETTE_LAYOUT } from "./spiderette_layout";
import { SpideretteGame } from "./spiderette_game";
import { spideretteGestures } from "./spiderette_gestures";

/** Builds the Spiderette board scene, which is the same for both variants. */
export function makeSpideretteBoardScene(
  game: SpideretteGame,
  presentation: TablePresentation,
  onReady?: () => void,
): BoardScene {
  return makeTableBoardScene({
    game,
    layout: SPIDERETTE_LAYOUT,
    handleIntent: spideretteGestures(game),
    presentation,
    onReady,
  });
}
