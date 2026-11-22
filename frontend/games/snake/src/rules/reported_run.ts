import { count } from "@fz/core/format";
import { isCount, isRecord } from "@fz/core/json";
import { isKeyOf, isOneOf } from "@fz/core/records";
import { BOARD_SIZE } from "./arena";
import { directionTo } from "./geometry";
import type { Crash, Outcome, Run, StepKind } from "./run";
import { type SavedRun, restoreRun } from "./saved_run";

/**
 * Describes a run as a bug report carries it: as storage keeps one under
 * way, but in any outcome, an ended one with its crash and last step.
 */
export interface ReportedRun extends Omit<SavedRun, "apple"> {
  /** The apple as an `[x, y]` pair, or null once the snake fills the board. */
  readonly apple: readonly [number, number] | null;
  readonly outcome: Outcome;
  readonly crash: Crash | null;
  readonly last: StepKind | null;
}

const CRASHES: Readonly<Record<Crash, true>> = { wall: true, self: true };

/** The last steps a run may have taken, by each outcome it may have. */
const LAST_STEPS: Readonly<Record<Outcome, readonly (StepKind | null)[]>> = {
  ready: [null],
  playing: [null, "moved", "ate"],
  paused: [null, "moved", "ate"],
  over: ["crashed"],
  won: ["won"],
};

/** Returns a run as a bug report carries it, whatever its outcome. */
export function reportRun(run: Run): ReportedRun {
  return {
    snake: run.snake.map(({ x, y }) => [x, y] as const),
    heading: run.heading,
    turns: run.turns,
    apple: run.apple ? [run.apple.x, run.apple.y] : null,
    seed: run.seed,
    eaten: run.eaten,
    speed: run.speed,
    steps: run.steps,
    outcome: run.outcome,
    crash: run.crash,
    last: run.last,
  };
}

/**
 * Returns the error a reported state throws for a part this build can't
 * trust, naming the part, such as `run.crash`.
 */
export function untrustedPart(part: string): Error {
  return new Error(`The game state's ${part} doesn't fit this build.`);
}

/**
 * Returns a reported run under a new id, in the outcome it was reported in,
 * its snake, apple and turns read as `restoreRun()` reads a saved run's.
 *
 * @throws Error naming the first part that can't be trusted: the outcome, a
 *   crash or a last step the outcome doesn't allow, or the run itself, as
 *   `restoreRun()` refuses it.
 */
export function readReportedRun(value: unknown, id: number): Run {
  if (!isRecord(value)) throw untrustedPart("run");
  const { outcome } = value;
  if (!isKeyOf(outcome, LAST_STEPS)) throw untrustedPart("run.outcome");
  const crash = crashOf(value["crash"], outcome);
  const last = lastOf(value["last"], outcome);
  const run = outcome === "won" ? restoreWon(value, id) : restoreRun(value, id);
  if (!run) throw untrustedPart("run");
  return { ...run, outcome, crash, last };
}

/**
 * Returns a reported run's crash: one where it ended by crashing, and none
 * where it didn't.
 *
 * @throws Error naming the crash where it is missing, or where it isn't one.
 */
function crashOf(crash: unknown, outcome: Outcome): Crash | null {
  if (outcome !== "over" && crash === null) return null;
  if (outcome === "over" && isKeyOf(crash, CRASHES)) return crash;
  throw untrustedPart("run.crash");
}

/**
 * Returns a reported run's last step: the crash or the win that ended it,
 * or else a move, a meal or none.
 *
 * @throws Error naming the last step where the outcome doesn't allow it.
 */
function lastOf(last: unknown, outcome: Outcome): StepKind | null {
  if (isOneOf(last, LAST_STEPS[outcome])) return last;
  throw untrustedPart("run.last");
}

/**
 * Returns a won run under a new id, or null if it can't be trusted. Its
 * snake fills the board, so it has no apple, which every saved run has: it
 * is read as the saved run whose apple lies where its tail ends, and its
 * tail is then checked beside the rest.
 */
function restoreWon(value: Record<string, unknown>, id: number): Run | null {
  const { snake, apple, eaten } = value;
  if (apple !== null || !Array.isArray(snake) || !isCount(eaten)) return null;
  const squares: readonly unknown[] = snake;
  if (squares.length !== BOARD_SIZE * BOARD_SIZE) return null;
  const short = restoreRun(
    {
      ...value,
      snake: squares.slice(0, -1),
      apple: squares.at(-1),
      eaten: eaten - 1,
    },
    id,
  );
  if (!short?.apple) return null;
  const end = short.snake.at(-1);
  if (!end || !directionTo(end, short.apple)) return null;
  return { ...short, snake: [...short.snake, short.apple], eaten, apple: null };
}

/**
 * Returns a run in one line for a bug report: its score, its steps, and
 * where it stands, "Score 12 · 140 steps · ran into the wall".
 */
export function summarizeRun(run: Run): string {
  return `Score ${run.eaten} · ${count(run.steps, "step", "steps")} · ${standing(run)}`;
}

/** Returns where a run stands, as a report's summary ends. */
function standing(run: Run): string {
  switch (run.outcome) {
    case "ready":
      return "not started";
    case "playing":
      return "in play";
    case "paused":
      return "paused";
    case "over":
      return run.crash === "self" ? "ran into itself" : "ran into the wall";
    case "won":
      return "filled the board";
  }
}
