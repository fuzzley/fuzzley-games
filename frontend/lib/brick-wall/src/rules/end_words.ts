// The words a wall game's ended run is told in, by the result, by the
// board's Ended card after it and as the announcer says it ends, kept in one
// place so they say the same.

import type { RunStage } from "@fz/core/run";

/** Returns what an ended run is called: "Every level cleared!" once it won, else "Game over". */
export function endTitle(run: { readonly outcome: RunStage }): string {
  return run.outcome === "won" ? "Every level cleared!" : "Game over";
}

/** Returns where a run was lost: "Lost on level 3, Gravel". */
export function whereLost(level: number, name: string): string {
  return `Lost on level ${String(level)}, ${name}`;
}

/** Returns what the button that tries a lost level again says: "Try again from level 3". */
export function tryAgainLabel(level: number): string {
  return `Try again from level ${String(level)}`;
}
