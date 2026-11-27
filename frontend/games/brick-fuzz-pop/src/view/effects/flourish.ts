// How a freed friend hops down from its cage, Brick Fuzz Pop's own
// flourish. The curves every wall game's flourishes move by are
// `@fz/core/motion`'s.

import { RADIUS } from "@fz/brick-wall/rules/field";

/** How high a freed friend hops over its cage, at the top of its hop to the floor, in field units. */
export const HOP_HEIGHT = 0.6;

/**
 * Returns how high a freed friend's middle is over the floor, in field units,
 * a share through its hop from its cage's height down to the floor, where it
 * waits as a fuzzball does: up {@link HOP_HEIGHT} over the cage, then down
 * along the curve a thrown thing falls by.
 */
export function hopHeight(done: number, from: number): number {
  const drop = from - RADIUS;
  // Thrown up at `up`, it tops out HOP_HEIGHT over the cage and lands at 1.
  const up =
    2 * (HOP_HEIGHT + Math.sqrt(HOP_HEIGHT * HOP_HEIGHT + HOP_HEIGHT * drop));
  return from + up * done - (up + drop) * done * done;
}
