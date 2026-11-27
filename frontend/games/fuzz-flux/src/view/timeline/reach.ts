// When each of a wave's blasts goes off, and when it reaches each square
// it strikes: a blast the move or a bunch sets off a moment after the
// bunches hop off, or after its pair's wind-up; one another blast sets
// off as that one reaches it; and each reaches out a step at a time, at
// the pace of its kind.

import { itemAt } from "@fz/core/records";
import {
  BLAST_IDS,
  type BlastId,
  MADE_IDS,
} from "../../rules/catalog/specials";
import type { Blast, Wave } from "../../rules/move/record";
import type { FeelTuning } from "./feel";

/** Describes when a blast goes off and reaches each step of its strikes. */
export interface Reach {
  readonly startMs: number;
  /** How long a frizzball's static takes to leap to each fuzzball it strikes, quicker the more there are. */
  readonly leapMs: number;
  /** When a frizzball bursts, its static leapt to all it strikes and held there. */
  readonly burstMs: number;
  /** Returns when it reaches a step of its strikes. */
  readonly reachMs: (step: number) => number;
}

/** Describes the moments of a blast its steps are timed from. */
interface Moments {
  readonly startMs: number;
  readonly leaptMs: number;
  readonly burstMs: number;
}

/** Every special alone, and the frizzball, that goes off. */
const ALONE: ReadonlySet<BlastId> = new Set(MADE_IDS);

/** The blasts of a pair swapped together, which wind up before they go off: every blast but one alone. */
const PAIRS: ReadonlySet<BlastId> = new Set(
  BLAST_IDS.filter((what) => !ALONE.has(what)),
);

/** The blasts whose second step the board waits for before it falls, as a puffer's rings spread wide; the rest, the first. */
const WAITS_FOR_SECOND: ReadonlySet<BlastId> = new Set<BlastId>([
  "puffer",
  "two-puffers",
  "wisp-and-puffer",
  "frizzball-and-puffer",
]);

/** Returns when each of a wave's blasts goes off and reaches each step, in its order, its bunches hopping off at a moment. */
export function reachesOf(
  wave: Wave,
  hopsMs: number,
  feel: FeelTuning,
): readonly Reach[] {
  const reaches: Reach[] = [];
  for (const blast of wave.blasts) {
    const startMs =
      blast.setOffBy === null
        ? hopsMs + (PAIRS.has(blast.what) ? feel.pairMs : feel.blastAfterMs)
        : itemAt(reaches, blast.setOffBy).reachMs(blast.wait);
    reaches.push(reachOf(blast, startMs, feel));
  }
  return reaches;
}

/** Returns the latest a blast holds the board until: as it reaches its first step, or a puffer's its second. */
export function heldUntilMs(blast: Blast, reach: Reach): number {
  return reach.reachMs(WAITS_FOR_SECOND.has(blast.what) ? 2 : 1);
}

/** Returns when a blast going off at a moment reaches each step. */
function reachOf(blast: Blast, startMs: number, feel: FeelTuning): Reach {
  const count = blast.strikes.length;
  const leapMs = Math.min(
    feel.frizzballStepMs,
    feel.frizzballMostMs / Math.max(1, count),
  );
  const leaptMs = startMs + count * leapMs;
  const burstMs = leaptMs + feel.frizzballHoldMs;
  return {
    startMs,
    leapMs,
    burstMs,
    reachMs: stepsOf(blast.what, { startMs, leaptMs, burstMs }, feel),
  };
}

/** Returns when a blast of a kind reaches each step, from when it goes off, when a frizzball's static has leapt to all it strikes, and when it bursts. */
function stepsOf(
  what: BlastId,
  { startMs, leaptMs, burstMs }: Moments,
  feel: FeelTuning,
): (step: number) => number {
  switch (what) {
    case "frizzball":
      return () => burstMs;
    case "frizzball-and-dasher":
    case "frizzball-and-puffer":
    case "frizzball-and-wisp":
      return (step) =>
        leaptMs + feel.frizzballPairAfterMs + step * feel.frizzballPairStepMs;
    case "two-frizzballs":
      return (step) =>
        startMs +
        feel.twoFrizzballsStrikeAfterMs +
        step * feel.twoFrizzballsStepMs;
    case "wisp":
    case "two-wisps":
    case "wisp-and-dasher-across":
    case "wisp-and-dasher-down":
    case "wisp-and-puffer":
      return (step) => startMs + feel.wispMs + (step - 1) * feel.wispGapMs;
    case "puffer":
    case "two-puffers":
      return (step) => startMs + feel.pufferInMs + step * feel.pufferRingMs;
    case "dasher-across":
    case "dasher-down":
    case "two-dashers":
    case "dasher-and-puffer":
      return (step) =>
        startMs + feel.streaksAfterMs + step * feel.dasherSquareMs;
  }
}
