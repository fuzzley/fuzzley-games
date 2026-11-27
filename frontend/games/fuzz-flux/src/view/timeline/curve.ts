// A flight along the sketch's curve from one place to another: eased in
// and out the whole way, bowing to one side by its bend and rising a
// little in the middle, as a wisp's copy flies to where it lands and a
// fuzzball's copy to its goal.

import { lerp } from "@fz/core/math";
import { eased } from "./easing";
import type { FeelTuning } from "./feel";
import type { Key, Keys, Place } from "./timeline";

/** Describes the numbers of a look that a curve moves. */
interface OnCurve {
  x: number;
  y: number;
  leanX: number;
  leanY: number;
}

/**
 * Returns the keys of a sprite flying a curve from where it stands to a
 * place, its bow and rise in its lean, at their widest halfway.
 *
 * @param bend How far it bows, in squares, to the right of its way on the
 *   screen for more than 0, and to the left for less.
 */
export function curveKeys(
  from: Place,
  to: Place,
  bend: number,
  atMs: number,
  ms: number,
  feel: FeelTuning,
): Keys {
  return {
    x: [{ atMs, ms, to: to.x, easing: "in-out" }],
    y: [{ atMs, ms, to: to.y, easing: "in-out" }],
    leanX: outAndBack(widestLeanX(from, to, bend, feel), atMs, ms),
    leanY: outAndBack(widestLeanY(from, to, bend, feel), atMs, ms),
  };
}

/**
 * Writes where a curve from a place to another, bowing by a bend, stands a
 * share of the way through its time into a record, as its keys would, and
 * returns the record.
 */
export function curveAt<Into extends OnCurve>(
  from: Place,
  to: Place,
  bend: number,
  done: number,
  feel: FeelTuning,
  into: Into,
): Into {
  const along = eased("in-out", done);
  const out = eased("in-out", done < 0.5 ? 2 * done : 2 - 2 * done);
  into.x = lerp(from.x, to.x, along);
  into.y = lerp(from.y, to.y, along);
  into.leanX = widestLeanX(from, to, bend, feel) * out;
  into.leanY = widestLeanY(from, to, bend, feel) * out;
  return into;
}

/** Returns how far a curve leans across at its widest, halfway, square to its way by its bow. */
function widestLeanX(
  from: Place,
  to: Place,
  bend: number,
  feel: FeelTuning,
): number {
  return (-(to.y - from.y) / farOf(from, to)) * bend * feel.curveArc;
}

/** Returns how far a curve leans down at its widest, halfway, square to its way by its bow and up by its rise. */
function widestLeanY(
  from: Place,
  to: Place,
  bend: number,
  feel: FeelTuning,
): number {
  return (
    ((to.x - from.x) / farOf(from, to)) * bend * feel.curveArc -
    feel.curveRiseSquares
  );
}

/** Returns how far apart two places are, or 1 for one place, which has no way to bow from. */
function farOf(from: Place, to: Place): number {
  return Math.hypot(to.x - from.x, to.y - from.y) || 1;
}

/** Returns the keys of a number moving out to a value halfway through a while and back to 0 by its end. */
function outAndBack(most: number, atMs: number, ms: number): readonly Key[] {
  return [
    { atMs, ms: ms / 2, to: most, easing: "in-out" },
    { atMs: atMs + ms / 2, ms: ms / 2, to: 0, easing: "in-out" },
  ];
}
