import { BoardScene } from "@/engine/render/phaser/board_scene";
import { TablePresentation } from "@/engine/render/presentation";
import { makeTableBoardScene } from "@/games/common/board_scene_factory";
import { SPIDERETTE_LAYOUT } from "./spiderette_layout";
import { SpideretteGame } from "./spiderette_game";
import { spideretteGestures } from "./spiderette_gestures";

/**
 * Builds the Spiderette board scene.
 *
 * One board for both variants: they differ in the opening deal, which the game
 * has already laid out by the time a board draws it, and in nothing drawn.
 *
 * Spiderette writes its own gesture map rather than taking the shared stockless
 * one, because pressing its stock deals a row.
 */
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
