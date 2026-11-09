/**
 * Names where a run stands, among the stages the games' runs pass through:
 * waiting for its first move, under way, paused, a stage cleared, or ended,
 * lost or won.
 */
export type RunStage =
  "ready" | "playing" | "paused" | "cleared" | "over" | "won";

/**
 * Names what the keys every game shares ask of its run: to pause; to pause
 * or go on, as it isn't (`toggle`); or to go on (`go`).
 */
export type RunCommand = "pause" | "toggle" | "go";

/**
 * What the keys every game shares ask of its run, by `event.code`: Escape
 * pauses, P pauses or goes on, and Enter goes on.
 */
export const RUN_KEYS: Readonly<Record<string, RunCommand>> = {
  Escape: "pause",
  KeyP: "toggle",
  Enter: "go",
  NumpadEnter: "go",
};

/** Returns whether a run at a stage is under way: in play or paused. */
export function isUnderWay(stage: RunStage): boolean {
  return stage === "playing" || stage === "paused";
}

/** Returns whether a run at a stage has ended, lost or won. */
export function hasEnded(stage: RunStage): boolean {
  return stage === "over" || stage === "won";
}
