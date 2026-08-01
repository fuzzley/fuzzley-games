import { BoardScene } from "@/engine/render/phaser/board_scene";
import { TablePresentation } from "@/engine/render/presentation";
import { makeTableBoardScene } from "@/games/common/board_scene_factory";
import { SCORPION_LAYOUT } from "./scorpion_layout";
import { ScorpionGame } from "./scorpion_game";
import { scorpionGestures } from "./scorpion_gestures";

/**
 * Builds the Scorpion board scene.
 *
 * Scorpion writes its own gesture map rather than taking the shared stockless
 * one, because pressing its stock deals.
 */
export function makeScorpionBoardScene(
  game: ScorpionGame,
  presentation: TablePresentation,
): BoardScene {
  return makeTableBoardScene({
    game,
    layout: SCORPION_LAYOUT,
    handleIntent: scorpionGestures(game),
    presentation,
  });
}
