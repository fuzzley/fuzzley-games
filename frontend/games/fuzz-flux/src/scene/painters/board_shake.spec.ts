import { MOVE_FIXTURES } from "../../testing/move_fixtures";
import {
  type Board,
  drawnPlay,
  playTo,
  startBoard,
} from "../../testing/scene_shell";
import { FEEL } from "../../view/timeline/feel";
import { frameFor, sampleAt } from "../../view/timeline/sample";
import type { Effect } from "../../view/timeline/timeline";

/** A shake 8 px across at the tap. */
const SHAKE: Effect = { what: "shake", atMs: 0, px: 8 };

/** The device pixels to a CSS pixel of the canvas a shake is played on. */
const PIXEL_RATIO = 2;

/** Runs the scene on a board, on a canvas of two device pixels to a CSS pixel, and plays a shake a time in. */
async function shakenBoard(ms: number): Promise<Board> {
  const board = await startBoard(MOVE_FIXTURES.bunch);
  board.run.game.scale.displayScale.set(PIXEL_RATIO, PIXEL_RATIO);
  playTo(board, drawnPlay({ effects: [SHAKE] }), ms);
  return board;
}

/** Returns how far the board is shaken a time into the shake, in CSS pixels, as the view samples it. */
function shakeAt(ms: number): { readonly x: number; readonly y: number } {
  const { timeline } = drawnPlay({ effects: [SHAKE] });
  return sampleAt(timeline, FEEL, ms, frameFor(timeline)).board.shake;
}

describe("BoardShake", () => {
  it("shakes the board by scrolling the camera against the shake, by whole device pixels at the canvas's ratio", async () => {
    const board = await shakenBoard(32);
    const shake = shakeAt(32);

    const { scrollX, scrollY } = board.run.scene.cameras.main;

    expect([scrollX, scrollY]).toEqual([
      -Math.round(shake.x * PIXEL_RATIO),
      -Math.round(shake.y * PIXEL_RATIO),
    ]);
  });

  it("brings the camera back to rest once the shake has died away", async () => {
    const board = await shakenBoard(2000);

    const { scrollX, scrollY } = board.run.scene.cameras.main;

    expect(Math.hypot(scrollX, scrollY)).toBe(0);
  });
});
