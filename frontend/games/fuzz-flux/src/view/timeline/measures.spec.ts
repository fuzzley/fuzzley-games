import { moveStartOf } from "../../testing/shown_board";
import { SKETCH_MOVES } from "../../testing/sketch_moves";
import type { MoveFixture } from "../../testing/move_fixtures";
import { timelineOf } from "./build";
import { FEEL } from "./feel";

/** How long a frame of the sketch's storyboard clips lasts, at 30 a second. */
const FRAME_MS = 1000 / 30;

/**
 * How many frames a storyboard's clip (`docs/fuzz-flux/mocks/clips/`)
 * holds besides the move's own, as `docs/fuzz-flux/mocks/make-mocks.mjs`
 * takes it: the 8 it rests before the tap, the 3 the swipe takes until the
 * swap, and the 16 it rests once the board takes a move again.
 */
const AROUND_FRAMES = 8 + 3 + 16;

/** Returns on which frame from the swap a move the sketch played comes to rest, as a clip at 30 a second shows it. */
function restFrameOf(fixture: MoveFixture): number {
  const timeline = timelineOf(
    fixture.record,
    moveStartOf(fixture),
    FEEL,
    { speed: "normal", motion: "full" },
    null,
  );
  return Math.ceil(timeline.restMs / FRAME_MS);
}

describe("the design's measures", () => {
  it("brings the storyboard's bunch of 3 back to rest on the frame its clip of 49 does", () => {
    expect(restFrameOf(SKETCH_MOVES.bunchOfThree)).toBe(49 - AROUND_FRAMES);
  });

  it("plays the storyboard's five waves to rest on the frame its clip of 146 does", () => {
    expect(restFrameOf(SKETCH_MOVES.fiveWaves)).toBe(146 - AROUND_FRAMES);
  });
});
