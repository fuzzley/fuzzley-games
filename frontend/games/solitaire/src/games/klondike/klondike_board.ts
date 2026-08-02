import { BoardScene } from "@/engine/render/phaser/board_scene";
import { TablePresentation } from "@/engine/render/presentation";
import { makeTableBoardScene } from "@/games/common/board_scene_factory";
import { KLONDIKE_LAYOUT } from "./klondike_layout";
import { KlondikeGame } from "./klondike_game";
import { klondikeGestures } from "./klondike_gestures";

/**
 * Builds the Klondike board scene.
 *
 * Klondike writes its own gesture map rather than taking the shared stockless
 * one, because pressing its stock draws and pressing the empty slot recycles.
 * Everything else — measuring the grid, building a frame, resolving a drop —
 * is the same in every game and comes from the shared factory.
 */
export function makeKlondikeBoardScene(
  game: KlondikeGame,
  presentation: TablePresentation,
  onReady?: () => void,
): BoardScene {
  return makeTableBoardScene({
    game,
    layout: KLONDIKE_LAYOUT,
    handleIntent: klondikeGestures(game),
    presentation,
    onReady,
  });
}
