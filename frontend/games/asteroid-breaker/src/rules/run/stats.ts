// The records a player keeps at each speed: the runs started, the best
// score, the furthest wave, whether a run has cleared all thirty and the
// strays brought home, and each sector's best run.

import { countsByIdOf, isCount, isRecord } from "@fz/core/json";
import { recordOf } from "@fz/core/records";
import type { Run } from "./run";
import { SPEEDS, type Speed } from "../speed";

/** Counts one speed's runs. */
export interface SpeedStats {
  /** Runs started: a run counts from its first wave's first move. */
  readonly runs: number;
  /** The best run's score. */
  readonly best: number;
  /** The furthest wave a run has reached. */
  readonly furthest: number;
  /** The strays brought home, all told. */
  readonly strays: number;
  /** Whether a run has cleared every written wave, from the first. */
  readonly clearedAll: boolean;
}

/** A sector's best: the score of the best run started there, at each speed one has ended at. */
export type SectorBests = Readonly<Partial<Record<Speed, number>>>;

/** Holds the records: each speed's runs, and each sector's bests. */
export interface Stats {
  readonly speeds: Readonly<Record<Speed, SpeedStats>>;
  /** Each sector's bests, by the sector's id. */
  readonly sectors: Readonly<Record<string, SectorBests>>;
}

/** Describes what an ended run brings to the records: its speed, its score, the wave it reached, and the sector it started at. */
export interface EndedRun extends Pick<Run, "speed" | "score" | "wave"> {
  readonly sector: string;
}

const NO_RUNS: SpeedStats = {
  runs: 0,
  best: 0,
  furthest: 0,
  strays: 0,
  clearedAll: false,
};

/** A new player's records: no runs at any speed, and no bests. */
export const NO_STATS: Stats = {
  speeds: recordOf(SPEEDS, () => NO_RUNS),
  sectors: {},
};

/**
 * Returns the records as stored, keeping whatever of them still makes sense,
 * and the bests only of a sector the game still has.
 */
export function statsOf(value: unknown, sectors: readonly string[]): Stats {
  const saved = isRecord(value) ? value : {};
  const speeds = isRecord(saved["speeds"]) ? saved["speeds"] : {};
  return {
    speeds: recordOf(SPEEDS, (speed) => speedStatsOf(speeds[speed])),
    sectors: countsByIdOf(saved["sectors"], sectors, SPEEDS),
  };
}

/** Returns the records with a run started at a speed counted. */
export function withRunStarted(stats: Stats, speed: Speed): Stats {
  return withSpeedStats(stats, speed, (speedStats) => ({
    ...speedStats,
    runs: speedStats.runs + 1,
  }));
}

/**
 * Returns the records with an ended run's score and the wave it reached
 * kept, as the best and the furthest at its speed and its sector's best
 * where it beats them, or the same records if it beats none.
 */
export function withRunEnded(stats: Stats, run: EndedRun): Stats {
  const { best, furthest } = stats.speeds[run.speed];
  const bests = stats.sectors[run.sector] ?? {};
  const sectorBest = bests[run.speed] ?? -1;
  if (run.score <= best && run.wave <= furthest && run.score <= sectorBest) {
    return stats;
  }
  const kept = withSpeedStats(stats, run.speed, (speedStats) => ({
    ...speedStats,
    best: Math.max(best, run.score),
    furthest: Math.max(furthest, run.wave),
  }));
  return {
    ...kept,
    sectors: {
      ...kept.sectors,
      [run.sector]: { ...bests, [run.speed]: Math.max(sectorBest, run.score) },
    },
  };
}

/** Returns the records with strays brought home at a speed counted, or the same records for none. */
export function withStraysHome(
  stats: Stats,
  speed: Speed,
  strays: number,
): Stats {
  if (strays <= 0) return stats;
  return withSpeedStats(stats, speed, (speedStats) => ({
    ...speedStats,
    strays: speedStats.strays + strays,
  }));
}

/** Returns the records with a run at a speed that has cleared every written wave kept, or the same records if one had. */
export function withClearedAll(stats: Stats, speed: Speed): Stats {
  if (stats.speeds[speed].clearedAll) return stats;
  return withSpeedStats(stats, speed, (speedStats) => ({
    ...speedStats,
    clearedAll: true,
  }));
}

/** Returns whether an ended run's score is a new best: more points than any run before at its speed. */
export function isNewBest(stats: Stats, run: EndedRun): boolean {
  return run.score > stats.speeds[run.speed].best;
}

/** Returns the records with one speed's changed. */
function withSpeedStats(
  stats: Stats,
  speed: Speed,
  update: (speedStats: SpeedStats) => SpeedStats,
): Stats {
  return {
    ...stats,
    speeds: { ...stats.speeds, [speed]: update(stats.speeds[speed]) },
  };
}

/**
 * Returns one speed's records as stored, or none if they make no sense;
 * records kept before a run could clear all thirty read as none having.
 */
function speedStatsOf(value: unknown): SpeedStats {
  if (!isRecord(value)) return NO_RUNS;
  const { runs, best, furthest, strays, clearedAll } = value;
  if (
    !isCount(runs) ||
    !isCount(best) ||
    !isCount(furthest) ||
    !isCount(strays)
  ) {
    return NO_RUNS;
  }
  return { runs, best, furthest, strays, clearedAll: clearedAll === true };
}
