import { makeTableBoardScene } from "@/engine/board/table_board_scene";
import { BoardScene } from "@/engine/render/phaser/scene/board_scene";
import { TablePresentation } from "@/engine/render/presentation";
import { FAKE_TABLE_LAYOUT, fakeTableGestures } from "./board";
import { FakeTableGame } from "./game";

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
