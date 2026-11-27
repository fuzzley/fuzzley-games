// The sketch's easings: how far through its way a key has moved its number
// a share through its time, as sampling and a flight's curve both take it.

import { easeOutCubic } from "@fz/core/math";
import type { Easing } from "./timeline";

/** How far the sketch's "back" easing swings past its end, as a share of the way. */
const BACK_OVERSHOOT = 1.4;

/** How many half turns the sketch's "spring" easing swings through over its time, of which the first two show. */
const SPRING_HALF_TURNS = 3.2;

/** How fast the sketch's "spring" easing's swing dies away, by the power of e a whole key takes off it. */
const SPRING_DAMPING = 5.2;

/**
 * How far through each easing a key has moved its number, a share through
 * its time, each the sketch's but that a spring lands on its key's end,
 * which the sketch's misses by a little.
 */
const EASE: Readonly<Record<Easing, (done: number) => number>> = {
  linear: (done) => done,
  out: easeOutCubic,
  in: (done) => done * done,
  "in-out": (done) =>
    done < 0.5 ? 2 * done * done : 1 - (2 - 2 * done) ** 2 / 2,
  back: (done) =>
    1 +
    (BACK_OVERSHOOT + 1) * (done - 1) ** 3 +
    BACK_OVERSHOOT * (done - 1) ** 2,
  spring: (done) =>
    done < 1
      ? 1 -
        Math.cos(done * Math.PI * SPRING_HALF_TURNS) *
          Math.exp(-done * SPRING_DAMPING)
      : 1,
};

/** Returns how far through its way an easing has moved a number a share through its time. */
export function eased(easing: Easing, done: number): number {
  return EASE[easing](done);
}
