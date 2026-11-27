// How each flourish a move spawns looks a share through its life, as the
// sketch draws it, for the scene to play from its moment on: a wave's
// mark fading in as it pops up, then rising and fading away.

import { eased } from "../timeline/easing";
import type { FeelTuning } from "../timeline/feel";

/** How far through its showing a wave's mark has faded in, a share of it. */
const MARK_IN = 0.2;

/** How much larger than its size a wave's mark pops in, a share of it. */
const MARK_POP = 0.3;

/** How many times faster than its showing a wave's mark springs back from its pop. */
const MARK_POP_PACE = 3;

/** Returns how opaque a wave's mark is a share through its showing: fading in over its first fifth, and out over the rest. */
export function markAlpha(done: number): number {
  return done < MARK_IN ? done / MARK_IN : (1 - done) / (1 - MARK_IN);
}

/** Returns how large a wave's mark is drawn a share through its showing, as a scale of its size: popping in larger, and springing back. */
export function markScale(done: number): number {
  return (
    1 + MARK_POP * (1 - eased("spring", Math.min(1, done * MARK_POP_PACE)))
  );
}

/** Returns how far a wave's mark has risen from its place a share through its showing, in squares. */
export function markRise(done: number, feel: FeelTuning): number {
  return done * feel.markRiseSquares;
}
