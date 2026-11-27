// How a flourish that changes a thing's size or place moves over its time,
// each from 0 as it starts to 1 once it is over, but a shake, which moves by
// its milliseconds; and how often a cue may blink. A flourish that only
// fades moves by `math.ts`'s `fadeAlpha()`, and one that eases out with no
// curve of its own by its `easeOutCubic()`.

import { easeOutCubic, lerp } from "./math";

/**
 * How far the overshooting ease swings past its end and back: the usual
 * "back" ease's constant, which overshoots by a tenth of the way.
 */
export const OVERSHOOT = 1.70158;

/** How far a thing struck swells as the blow lands, as a share of its size. */
export const SWELL = 0.14;

/** How large a look starts as it flares in, as a share of its size. */
export const FLARE_FROM = 0.4;

/** How wide a ring starts, as a share of its widest. */
export const RING_FROM = 0.25;

/**
 * How many times a second a shake swings a thing across and up, two rates
 * that never keep step, so it shakes rather than circles.
 */
export const SHAKE_RATES = { x: 23, y: 17 } as const;

/**
 * Returns how far something that overshoots has gone, a share through its
 * time: fast, past its end, then back to settle there.
 */
export function easeOutBack(done: number): number {
  const left = done - 1;
  return 1 + (OVERSHOOT + 1) * left * left * left + OVERSHOOT * left * left;
}

/**
 * Returns the scale of a thing struck that holds, a share through its
 * swell: swollen as the blow lands, then settling to its size, a little
 * under it first, as a thing with give does.
 */
export function swellScale(done: number): number {
  return lerp(1 + SWELL, 1, easeOutBack(done));
}

/** Returns the scale of a look flaring in, a share through its flare: growing in, past its size, then settling. */
export function flareScale(done: number): number {
  return lerp(FLARE_FROM, 1, easeOutBack(done));
}

/** Returns the scale of a ring, a share through its spreading: fast, then slowing. */
export function ringScale(done: number): number {
  return lerp(RING_FROM, 1, easeOutCubic(done));
}

/** Describes how far a shake moves a thing from where it rests. */
export interface Shift {
  x: number;
  y: number;
}

/**
 * Writes how far a shake moves a thing from where it rests into a record
 * and returns it, a time after the shake starts, in milliseconds: `most`
 * each way as it starts, times what its `fade` leaves of it a share
 * through its `lengthMs`, then none.
 */
export function shakeOf(
  sinceMs: number,
  lengthMs: number,
  most: number,
  fade: (done: number) => number,
  into: Shift,
): Shift {
  into.x = 0;
  into.y = 0;
  const done = sinceMs / lengthMs;
  if (!(done >= 0 && done < 1)) return into;
  const far = most * fade(done);
  const seconds = sinceMs / 1000;
  into.x = far * Math.sin(2 * Math.PI * SHAKE_RATES.x * seconds);
  into.y = far * Math.sin(2 * Math.PI * SHAKE_RATES.y * seconds);
  return into;
}

/**
 * The most times a second a cue may blink, since a flash more often than
 * three times a second can bring on a seizure.
 */
export const MOST_BLINKS_A_SECOND = 3;

/**
 * Returns whether a blinking cue, such as a warning, shows a time into its
 * blinking: for the first half of each period, so it shows as it starts.
 * It throws a `RangeError` for a period that would blink it more than
 * {@link MOST_BLINKS_A_SECOND} times a second.
 */
export function blinkShows(elapsedMs: number, periodMs: number): boolean {
  // Asked this way round, so a period that is NaN is refused too.
  if (!(periodMs * MOST_BLINKS_A_SECOND >= 1000)) {
    throw new RangeError(
      `A cue blinks ${String(MOST_BLINKS_A_SECOND)} times a second at the most, over a period of 1000 / ${String(MOST_BLINKS_A_SECOND)} ms or more, not ${String(periodMs)} ms.`,
    );
  }
  return elapsedMs % periodMs < periodMs / 2;
}
