// The ladder of the ring's frames. A ring's line thins as it spreads, so
// no one frame, scaled to the ring's radius, draws it at every moment:
// each rung draws the ring with its line as wide for its radius as a ring
// that spreads no further than the ladder reaches has it at some moment,
// a step thinner than the rung's above, from a ring's as it starts to a
// ring's that spreads as far as the ladder reaches as it ends.

import type { ArtScale } from "@fz/phaser/shapes";
import { ringLine, ringRadius } from "../effects/flourishes";
import { RING_RUNGS, type RingRung } from "./frame_names";

/** How far a ring may spread, in squares, and be drawn from the ladder's frames. */
const LADDER_REACH = 1;

/** How wide a ring's line is for its radius at the ladder's top rung: as a ring starts, as wide as it ever is. */
const TOP_RATIO = ringLine(0) / ringRadius(0, LADDER_REACH);

/** How wide a ring's line is for its radius at the ladder's foot: as a ring that spreads as far as the ladder reaches ends. */
const FOOT_RATIO = ringLine(1) / ringRadius(1, LADDER_REACH);

/** How many times as wide for its radius each rung's line is as the rung's below. */
const STEP = (TOP_RATIO / FOOT_RATIO) ** (1 / (RING_RUNGS.length - 1));

/**
 * The largest square the ladder's frames are drawn for, in device pixels:
 * 48 CSS pixels at a pixel ratio of 3. A board of larger squares shows
 * its rings scaled up from them, so the atlas keeps to its budget.
 */
const MOST_LADDER_SQUARE = 144;

/** Returns how wide a ring's line is for its radius at a rung of the ladder. */
export function rungRatio(rung: RingRung): number {
  return TOP_RATIO / STEP ** rung;
}

/**
 * Returns how far across a rung's frame draws its ring, in squares of a
 * scale it is baked at: no less far than any ring spreads while that rung
 * is the nearest its line for its radius, so the scene only ever scales
 * the frame down, but past a square of {@link MOST_LADDER_SQUARE}, where
 * the frame is drawn for that square and scaled up.
 */
export function rungRadius(rung: RingRung, scale: ArtScale): number {
  const widest = Math.min(
    LADDER_REACH,
    (ringLine(0) * Math.sqrt(STEP)) / rungRatio(rung),
  );
  return widest * Math.min(1, MOST_LADDER_SQUARE / scale.unit);
}
