// How the flourishes that change a thing's size or place move over their
// time, each from 0 as it starts to 1 once it is over. The rest only fade
// or spread, by `@fz/core/math`'s `fadeAlpha()` and `easeOutCubic()`.

import { easeOutCubic, lerp } from "@fz/core/math";
import { RADIUS } from "../../rules/tuning";
import { SHAKE_CSS_PX, SHAKE_MS } from "./timing";

/**
 * How far the overshooting ease swings past its end and back: the usual
 * "back" ease's constant, which overshoots by a tenth of the way.
 */
export const OVERSHOOT = 1.70158;

/** How far a struck brick swells as the strike lands, as a share of its size. */
export const SWELL = 0.14;

/** How large the waiting fuzzball's boon look starts as it flares in, as a share of its size. */
export const FLARE_FROM = 0.4;

/** How high a freed friend hops over its cage, at the top of its hop to the floor, in field units. */
export const HOP_HEIGHT = 0.6;

/**
 * How many times a second a lost level's shake swings the field across and
 * up, two rates that never keep step, so it shakes rather than circles.
 */
export const SHAKE_RATES = { x: 23, y: 17 } as const;

/** How wide a blast's ring starts, as a share of its widest. */
export const RING_FROM = 0.25;

/**
 * Returns how far something that overshoots has gone, a share through its
 * time: fast, past its end, then back to settle there.
 */
export function easeOutBack(done: number): number {
  const left = done - 1;
  return 1 + (OVERSHOOT + 1) * left * left * left + OVERSHOOT * left * left;
}

/**
 * Returns the scale of a struck brick that holds, a share through its
 * swell: swollen as the strike lands, then settling to its size, a little
 * under it first, as a thing with give does.
 */
export function swellScale(done: number): number {
  return lerp(1 + SWELL, 1, easeOutBack(done));
}

/** Returns the scale of the waiting fuzzball's boon look, a share through its flare: growing in, past its size, then settling. */
export function flareScale(done: number): number {
  return lerp(FLARE_FROM, 1, easeOutBack(done));
}

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

/** Returns the scale of a blast's ring, spreading fast, then slowing. */
export function ringScale(done: number): number {
  return lerp(RING_FROM, 1, easeOutCubic(done));
}

/** Describes how far the field is shaken from where it rests, in device pixels. */
export interface Shift {
  x: number;
  y: number;
}

/**
 * Writes how far a lost level's shake moves the field from where it rests
 * into a record and returns it, in device pixels at a pixel ratio, a time
 * after the level is lost, in milliseconds: all of it at once, dying away,
 * then none.
 */
export function shakeOf(
  sinceMs: number,
  pixelRatio: number,
  into: Shift,
): Shift {
  into.x = 0;
  into.y = 0;
  const done = sinceMs / SHAKE_MS;
  if (!(done >= 0 && done < 1)) return into;
  const most = SHAKE_CSS_PX * pixelRatio * (1 - done);
  const seconds = sinceMs / 1000;
  into.x = most * Math.sin(2 * Math.PI * SHAKE_RATES.x * seconds);
  into.y = most * Math.sin(2 * Math.PI * SHAKE_RATES.y * seconds);
  return into;
}
