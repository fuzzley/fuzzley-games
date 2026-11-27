import { itemAt } from "@fz/core/records";
import { MOVE_FIXTURES } from "../../testing/move_fixtures";
import { type Board, layoutOf, startBoard } from "../../testing/scene_shell";
import { sampleHand, handTimeline } from "../../view/idle/hand";
import { FEEL } from "../../view/timeline/feel";
import { frameFor } from "../../view/timeline/sample";
import type { Sampled, Timeline } from "../../view/timeline/timeline";

/** The hand showing a swap of the top left square with the one right of it. */
const HAND: Timeline = handTimeline(
  { from: { x: 0, y: 0 }, to: { x: 1, y: 0 } },
  FEEL,
  "full",
);

/** Returns where the hand stands a time into its showing, as the view samples it. */
function handAt(ms: number): Sampled {
  return itemAt(sampleHand(HAND, FEEL, ms, frameFor(HAND)).sprites, 0);
}

/** Runs the scene on a board the shell hands the hand to, and draws frames until the hand has shown a time. */
async function handedBoard(ms: number): Promise<Board> {
  const board = await startBoard(MOVE_FIXTURES.bunch);
  board.shell.handShown = HAND;
  board.run.advance(ms + 16);
  return board;
}

/** A time into the hand's showing at which it is sliding, a frame's time apart from the tap. */
const SLIDING_MS =
  Math.round(
    (FEEL.handLoopMs * (FEEL.handSlidesFrom + FEEL.handSlidesTo)) / 2 / 16,
  ) * 16;

describe("HandPainter", () => {
  it("shows the hand where its timeline has it since the shell handed it", async () => {
    const board = await handedBoard(SLIDING_MS);
    const { x, y, square } = layoutOf(board);
    const sampled = handAt(SLIDING_MS);

    const { image } = board.scene.hand;

    expect({
      at: [image.x, image.y],
      alpha: image.alpha,
      visible: image.visible,
    }).toEqual({
      at: [
        expect.closeTo(x + (sampled.x + 0.5) * square, 9),
        expect.closeTo(y + (sampled.y + 0.5) * square, 9),
      ],
      alpha: expect.closeTo(1 - sampled.fade, 9) as number,
      visible: true,
    });
  });

  it("shows the hand again and again, from its start each time it ends", async () => {
    const once = await handedBoard(SLIDING_MS);
    const again = await handedBoard(SLIDING_MS + FEEL.handLoopMs);

    expect(again.scene.hand.image.x).toBeCloseTo(once.scene.hand.image.x, 9);
  });

  it("hides the hand once the shell hands none", async () => {
    const board = await handedBoard(SLIDING_MS);

    board.shell.handShown = null;
    board.run.advance(16);

    expect(board.scene.hand.image.visible).toBe(false);
  });

  it("shows a hand handed anew from its start", async () => {
    const board = await handedBoard(SLIDING_MS);
    board.shell.handShown = null;
    board.run.advance(16);

    board.shell.handShown = HAND;
    board.run.advance(SLIDING_MS + 16);

    expect(board.scene.hand.image.x).toBeCloseTo(
      layoutOf(board).x + (handAt(SLIDING_MS).x + 0.5) * layoutOf(board).square,
      9,
    );
  });
});
