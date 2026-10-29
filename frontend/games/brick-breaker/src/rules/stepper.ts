import { MAX_STEPS_PER_FRAME, STEP_S } from "./tuning";

/** How long a step of the field is, in milliseconds. */
export const STEP_MS = STEP_S * 1000;

/** Keeps a field's time between frames: what is under way toward its next step. */
export interface Clock {
  /** The time since the last step, in milliseconds, less than a step's. */
  carried: number;
}

/** Returns a clock with no time under way. */
export function createClock(): Clock {
  return { carried: 0 };
}

/**
 * Returns how many steps a frame's time holds, at most
 * {@link MAX_STEPS_PER_FRAME}, and keeps on the clock what is left toward
 * the next.
 *
 * A frame too long for its steps drops the rest rather than catching up
 * later, so a stall slows the game rather than leaping it on; a frame of no
 * time, less, or not a number, adds none.
 */
export function advanceClock(clock: Clock, deltaMs: number): number {
  const time = clock.carried + (deltaMs > 0 ? deltaMs : 0);
  const steps = Math.floor(time / STEP_MS);
  if (steps > MAX_STEPS_PER_FRAME) {
    clock.carried = 0;
    return MAX_STEPS_PER_FRAME;
  }
  clock.carried = time - steps * STEP_MS;
  return steps;
}

/** Returns how far a clock is from its last step to its next, from 0 to 1. */
export function progressOf(clock: Clock): number {
  return clock.carried / STEP_MS;
}
