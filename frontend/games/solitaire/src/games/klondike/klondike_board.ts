import { BoardScene } from "@/engine/render/phaser/board_scene";
import { TablePresentation } from "@/engine/render/presentation";
import { makeTableBoardScene } from "@/games/common/board_scene_factory";
import { KLONDIKE_LAYOUT } from "./klondike_layout";
import { KlondikeGame } from "./klondike_game";
import { klondikeGestures } from "./klondike_gestures";

/** Builds the Klondike board scene. */
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
