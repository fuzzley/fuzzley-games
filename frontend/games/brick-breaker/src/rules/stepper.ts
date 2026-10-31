import {
  type Clock,
  createClock,
  stepsIn as stepsOfLength,
} from "@fz/core/clock";
import { MAX_STEPS_PER_FRAME, STEP_S } from "./tuning";

/** How long a step of the field is, in milliseconds. */
export const STEP_MS = STEP_S * 1000;

/**
 * Returns how many of the field's steps a time spans, to the nearest.
 *
 * The field counts its timers in steps, as a step's time in milliseconds is
 * not a whole number and would creep in a sum.
 */
export function stepsIn(ms: number): number {
  return stepsOfLength(ms, STEP_MS);
}

/** Returns a clock of the field's steps, at most {@link MAX_STEPS_PER_FRAME} a frame, with no time under way. */
export function createFieldClock(): Clock {
  return createClock(STEP_MS, MAX_STEPS_PER_FRAME);
}
