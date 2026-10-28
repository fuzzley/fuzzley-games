import type { Run } from "./run";
import { SPEED_INFO } from "./speed";

/** Returns what is said as a run starts. */
export function describeStart(run: Run): string {
  return `Started, at ${SPEED_INFO[run.speed].name} speed.`;
}

/** Returns what is said as a run pauses. */
export function describePause(run: Run): string {
  return `Paused, with a score of ${run.eaten}. Press a direction to go on.`;
}

/** Returns what is said as a paused run goes on. */
export function describeResume(): string {
  return "Going on.";
}

/** Returns what is said of a run taken up after the page was left. */
export function describeTakenUp(run: Run): string {
  return `Your last run is paused, with a score of ${run.eaten}. Press a direction to go on.`;
}

/** Returns what is said as a run ends: why, the score, and whether it is a new best. */
export function describeEnd(run: Run, newBest: boolean): string {
  const why =
    run.outcome === "won"
      ? "You filled the board!"
      : run.crash === "self"
        ? "The snake ran into itself."
        : "The snake ran into the wall.";
  const best = newBest ? " A new best!" : "";
  return `${why} Score ${run.eaten}.${best}`;
}
