import { itemAt } from "@fz/core/records";
import type { GameObjects } from "phaser";
import { MOVE_FIXTURES } from "../../testing/move_fixtures";
import {
  type Board,
  layoutOf,
  playOf,
  playTo,
  startBoard,
  stillPlayOf,
} from "../../testing/scene_shell";
import { gridOf } from "../../testing/shown_board";
import { boardFrom } from "../../testing/board_picture";
import { FRAMES } from "../../view/art/frame_names";
import { markAlpha, markRise, markScale } from "../../view/effects/flourishes";
import { FEEL } from "../../view/timeline/feel";
import type { WaveMark } from "../../view/timeline/timeline";
import type { BoardPlay } from "../play_clock";

/** The play of two waves, the second of which shows the one mark. */
const TWO_WAVES: BoardPlay = playOf(MOVE_FIXTURES.twoWaves);

/** The mark the second wave shows. */
const MARK: WaveMark = itemAt(TWO_WAVES.timeline.marks, 0);

/** Returns the images of the marks the board shows. */
function marksShown({ scene }: Board): readonly GameObjects.Image[] {
  return scene.marks.marks.all
    .map(({ image }) => image)
    .filter(({ visible }) => visible);
}

/** Runs the scene on the two waves' board, and plays them to a time past the mark's moment. */
async function markedBoard(pastMs: number): Promise<Board> {
  const board = await startBoard(MOVE_FIXTURES.twoWaves);
  playTo(board, TWO_WAVES, MARK.atMs + pastMs);
  return board;
}

describe("MarksPainter", () => {
  it("shows no mark before its moment", async () => {
    const board = await markedBoard(-16);

    expect(marksShown(board)).toEqual([]);
  });

  it("shows a wave's mark from its moment, where the wave gathers, risen, grown and faded as far as it has played", async () => {
    const board = await markedBoard(FEEL.markMs / 2);
    const { x, y, square } = layoutOf(board);
    const playedMs = board.shell.ticks.at(-1)?.playedMs ?? 0;
    const done = (playedMs - MARK.atMs) / FEEL.markMs;

    const [image] = marksShown(board);

    expect({
      frame: image?.frame.name,
      x: image?.x,
      y: image?.y,
      scale: image?.scaleX,
      alpha: image?.alpha,
    }).toEqual({
      frame: FRAMES.times(MARK.times),
      x: x + (MARK.at.x + 0.5) * square,
      y: expect.closeTo(
        y + (MARK.at.y - markRise(done, FEEL) + 0.5) * square,
        9,
      ) as number,
      scale: expect.closeTo(markScale(done), 9) as number,
      alpha: expect.closeTo(markAlpha(done), 9) as number,
    });
  });

  it("hides a mark once it has played out", async () => {
    const board = await markedBoard(FEEL.markMs + 16);

    expect(marksShown(board)).toEqual([]);
  });

  it("plays a mark out as the next play starts", async () => {
    const board = await markedBoard(16);

    playTo(board, stillPlayOf(gridOf(boardFrom(["rgb", "gbr", "brg"]))), 16);

    expect(marksShown(board).map(({ frame }) => frame.name)).toEqual([
      FRAMES.times(MARK.times),
    ]);
  });
});
