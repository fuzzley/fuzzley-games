import { BoardScene } from "@/engine/render/phaser/board_scene";
import { TablePresentation } from "@/engine/render/presentation";
import { makeTableBoardScene } from "@/games/common/board_scene_factory";
import { MONTANA_LAYOUT } from "./montana_layout";
import { MontanaGame } from "./montana_game";
import { montanaGestures } from "./montana_gestures";

/** Builds the Montana board scene. */
export function makeMontanaBoardScene(
  game: MontanaGame,
  presentation: TablePresentation,
  onReady?: () => void,
): BoardScene {
  return makeTableBoardScene({
    game,
    layout: MONTANA_LAYOUT,
    handleIntent: montanaGestures(game),
    presentation,
    onReady,
  });
}
