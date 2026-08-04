import { BoardScene } from "@/engine/render/phaser/board_scene";
import { TablePresentation } from "@/engine/render/presentation";
import { makeTableBoardScene } from "@/games/common/board_scene_factory";
import { EASTHAVEN_LAYOUT } from "./easthaven_layout";
import { EasthavenGame } from "./easthaven_game";
import { easthavenGestures } from "./easthaven_gestures";

/**
 * Builds the Easthaven board scene.
 *
 * Easthaven writes its own gesture map rather than taking the shared stockless
 * one, because pressing its stock deals a row.
 */
export function makeEasthavenBoardScene(
  game: EasthavenGame,
  presentation: TablePresentation,
  onReady?: () => void,
): BoardScene {
  return makeTableBoardScene({
    game,
    layout: EASTHAVEN_LAYOUT,
    handleIntent: easthavenGestures(game),
    presentation,
    onReady,
  });
}
