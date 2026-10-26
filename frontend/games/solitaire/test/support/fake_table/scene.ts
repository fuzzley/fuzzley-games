import { makeTableBoardScene } from "@/engine/board/table_board_scene";
import type { BoardScene } from "@/engine/render/phaser/scene/board_scene";
import type { TablePresentation } from "@/engine/render/view/presentation";
import { FAKE_TABLE_LAYOUT, fakeTableGestures } from "./board";
import type { FakeTableGame } from "./game";

/** Builds the Phaser board scene that draws the fake game. */
export function makeFakeTableBoardScene(
  game: FakeTableGame,
  presentation: TablePresentation,
  onReady?: () => void,
): BoardScene {
  return makeTableBoardScene({
    game,
    layouts: { roomy: FAKE_TABLE_LAYOUT },
    handleIntent: fakeTableGestures(game),
    presentation,
    onReady,
  });
}
