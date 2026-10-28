import { type Run, step } from "./run";
import { stepMs } from "./speed";

/** The most steps one frame takes, however long it was. */
export const MAX_STEPS_PER_FRAME = 2;

/** Describes a run in time: the run, and the time toward its next step. */
export interface Clocked {
  readonly run: Run;
  /** How long the run has been under way since its last step, in milliseconds. */
  readonly carried: number;
}

/** Describes a run after a frame's time has passed. */
export interface Advanced extends Clocked {
  /** How far the run is from its last step to its next, from 0 to 1. */
  readonly progress: number;
}

/**
 * Returns a run a frame's time on: as many steps as the time holds, at most
 * {@link MAX_STEPS_PER_FRAME}, each as long as the speed says at that point,
 * and how far the run is toward the next.
 *
 * A run that isn't under way keeps no time, and a frame too long for its
 * steps drops what is left over rather than catching up later.
 */
export function advance({ run, carried }: Clocked, deltaMs: number): Advanced {
  let current = run;
  let time = carried + Math.max(0, deltaMs);
  for (let taken = 0; current.outcome === "playing"; taken++) {
    const length = stepMs(current.speed, current.eaten);
    if (time < length) {
      return { run: current, carried: time, progress: time / length };
    }
    if (taken === MAX_STEPS_PER_FRAME) break;
    time -= length;
    current = step(current);
  }
  return { run: current, carried: 0, progress: 0 };
}
