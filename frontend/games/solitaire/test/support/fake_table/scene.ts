import {
  type SceneRun,
  type SceneRunOptions,
  runScene,
} from "@fz/phaser/testing";
import { makeTableBoardScene } from "@/engine/board/table_board_scene";
import type { BoardScene } from "@/engine/render/phaser/scene/board_scene";
import { designSize } from "@/engine/render/layout/table_layout";
import type { TablePresentation } from "@/engine/render/view/presentation";
import { serveWorkspace } from "../workspace_files";
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

/**
 * Runs the fake game's board in real Phaser, as the shell's canvas shows a
 * board: on a canvas of its design size, so it is laid out at a scale of 1,
 * and its card atlases served from the workspace, unless the options say
 * otherwise.
 */
export async function runFakeTableBoard(
  game: FakeTableGame,
  presentation: TablePresentation,
  options: SceneRunOptions = {},
): Promise<SceneRun<BoardScene>> {
  return runScene(
    ({ insets, ready }) =>
      makeTableBoardScene({
        game,
        layouts: { roomy: FAKE_TABLE_LAYOUT },
        handleIntent: fakeTableGestures(game),
        presentation,
        onReady: ready,
        insets,
      }),
    { ...designSize(FAKE_TABLE_LAYOUT), serve: serveWorkspace, ...options },
  );
}
