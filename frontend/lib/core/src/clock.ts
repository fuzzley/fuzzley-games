/**
 * Keeps a game's time between frames in fixed steps: how long a step is, the
 * most a frame takes, and the time under way toward the next.
 */
export interface Clock {
  /** How long a step is, in milliseconds. */
  readonly stepMs: number;
  /** The most steps one frame takes, however long it was. */
  readonly maxStepsPerFrame: number;
  /** The time since the last step, in milliseconds, less than a step's. */
  carried: number;
}

/** Returns a clock of steps `stepMs` long, at most `maxStepsPerFrame` a frame, with no time under way. */
export function createClock(stepMs: number, maxStepsPerFrame: number): Clock {
  return { stepMs, maxStepsPerFrame, carried: 0 };
}

/**
 * Returns how many steps a frame's time holds, at most the clock's
 * `maxStepsPerFrame`, and keeps on the clock what is left toward the next.
 *
 * A frame too long for its steps drops the rest rather than catching up
 * later, so a stall slows the game rather than leaping it on; a frame of no
 * time, less, or not a number, adds none.
 */
export function advanceClock(clock: Clock, deltaMs: number): number {
  const time = clock.carried + (deltaMs > 0 ? deltaMs : 0);
  const steps = Math.floor(time / clock.stepMs);
  if (steps > clock.maxStepsPerFrame) {
    clock.carried = 0;
    return clock.maxStepsPerFrame;
  }
  clock.carried = time - steps * clock.stepMs;
  return steps;
}

/** Returns how far a clock is from its last step to its next, from 0 to 1. */
export function progressOf(clock: Clock): number {
  return clock.carried / clock.stepMs;
}

/**
 * Returns how many steps `stepMs` long a time spans, to the nearest.
 *
 * A game counts its timers in steps, as a step's time in milliseconds is
 * seldom a whole number and would creep in a sum.
 */
export function stepsIn(ms: number, stepMs: number): number {
  return Math.round(ms / stepMs);
}
