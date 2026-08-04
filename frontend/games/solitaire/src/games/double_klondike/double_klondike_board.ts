import { BoardScene } from "@/engine/render/phaser/board_scene";
import { TablePresentation } from "@/engine/render/presentation";
import { makeTableBoardScene } from "@/games/common/board_scene_factory";
import { DOUBLE_KLONDIKE_LAYOUT } from "./double_klondike_layout";
import { DoubleKlondikeGame } from "./double_klondike_game";
import { doubleKlondikeGestures } from "./double_klondike_gestures";

/**
 * Builds the Double Klondike board scene.
 *
 * Double Klondike writes its own gesture map rather than taking the shared
 * stockless one, because pressing its stock draws and pressing its empty stock
 * recycles.
 */
export function makeDoubleKlondikeBoardScene(
  game: DoubleKlondikeGame,
  presentation: TablePresentation,
  onReady?: () => void,
): BoardScene {
  return makeTableBoardScene({
    game,
    layout: DOUBLE_KLONDIKE_LAYOUT,
    handleIntent: doubleKlondikeGestures(game),
    presentation,
    onReady,
  });
}
