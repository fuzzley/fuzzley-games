import { BoardScene } from "@/engine/render/phaser/board_scene";
import { TablePresentation } from "@/engine/render/presentation";
import { makeTableBoardScene } from "@/games/common/board_scene_factory";
import { stocklessGestures } from "@/games/common/stockless_gestures";
import { SEAHAVEN_LAYOUT } from "./seahaven_layout";
import { SeahavenGame } from "./seahaven_game";

/**
 * Builds the Seahaven Towers board scene.
 *
 * The whole board is dealt at the start, so the shared stockless gestures are
 * the right ones unchanged: there is no stock for a single press to draw from.
 */
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
