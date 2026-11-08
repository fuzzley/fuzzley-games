// The records a player keeps at each speed: the runs started, the best
// score, the furthest wave, whether a run has cleared all thirty and the
// strays brought home, and each sector's best run; and what a change in a
// run brings to them and to the sectors reached.

import { countsByIdOf, isCount, isRecord } from "@fz/core/json";
import { recordOf } from "@fz/core/records";
import { type Run, hasClearedAll } from "./run";
import { SPEEDS, type Speed } from "../speed";
import {
  ENDLESS,
  type WaveEntry,
  opensEndless,
  waveEntryOf,
} from "../waves/waves";

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

/**
 * Describes what an ended run brings to the records: its speed, its score,
 * the wave it reached, and the sector it started at.
 */
export interface EndedRun extends Pick<Run, "speed" | "score" | "wave"> {
  readonly sector: string;
}

/**
 * Describes what a change in a run brings to the records at its speed, and
 * to the sectors reached.
 */
export interface RunRecords {
  readonly speed: Speed;
  /** Whether the change started the run: its first wave's first move. */
  readonly started: boolean;
  /** How many strays the change brought home. */
  readonly strays: number;
  /**
   * The ids of the sectors the change reached, which a run may start at
   * from then on: its wave's, as the run starts, goes on to a wave or is
   * taken up, and Endless, as the last written wave is cleared.
   */
  readonly reached: readonly string[];
  /** Whether the change cleared every written wave, from the first. */
  readonly clearedAll: boolean;
  /** What the run brings to the records as the change ends it, at its speed, or null. */
  readonly ended: Pick<EndedRun, "score" | "wave" | "sector"> | null;
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
export function readStats(value: unknown, sectors: readonly string[]): Stats {
  const saved = isRecord(value) ? value : {};
  const speeds = isRecord(saved["speeds"]) ? saved["speeds"] : {};
  return {
    speeds: recordOf(SPEEDS, (speed) => readSpeedStats(speeds[speed])),
    sectors: countsByIdOf(saved["sectors"], sectors, SPEEDS),
  };
}

/**
 * Returns what a change in a run brings to the records, from the run before
 * it to the run after, on a game's waves.
 *
 * A run taken up from storage has no run before it: it brings only its
 * wave's sector reached, the rest kept as it was played.
 */
export function recordsOf(
  before: Run | null,
  after: Run,
  waves: readonly WaveEntry[],
): RunRecords {
  const entry = waveEntryOf(waves, after.wave);
  const started =
    before?.outcome === "ready" &&
    after.outcome !== "ready" &&
    after.wave === after.firstWave;
  const intoEndless =
    before !== null &&
    before.outcome !== "cleared" &&
    after.outcome === "cleared" &&
    opensEndless(entry, waveEntryOf(waves, after.wave + 1));
  const reached: string[] = [];
  if (before === null || started || before.wave !== after.wave) {
    reached.push(entry.sector.id);
  }
  if (intoEndless) reached.push(ENDLESS.id);
  const ended =
    before !== null && before.outcome !== "over" && after.outcome === "over";
  return {
    speed: after.speed,
    started,
    strays: before === null ? 0 : after.strays - before.strays,
    reached,
    clearedAll: intoEndless && hasClearedAll(after, waves.length),
    ended: ended ? endOf(after, waves) : null,
  };
}

/**
 * Returns the records with what a change in a run brings to them kept, or
 * the same records if it brings nothing.
 */
export function withRecords(stats: Stats, records: RunRecords): Stats {
  const { speed, ended } = records;
  let kept = records.started ? withRunStarted(stats, speed) : stats;
  kept = withStraysHome(kept, speed, records.strays);
  if (records.clearedAll) kept = withClearedAll(kept, speed);
  return ended === null ? kept : withRunEnded(kept, { ...ended, speed });
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

/**
 * Returns the records with strays brought home at a speed counted, or the
 * same records for none.
 */
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

/**
 * Returns the records with a run at a speed that has cleared every written
 * wave kept, or the same records if one had.
 */
export function withClearedAll(stats: Stats, speed: Speed): Stats {
  if (stats.speeds[speed].clearedAll) return stats;
  return withSpeedStats(stats, speed, (speedStats) => ({
    ...speedStats,
    clearedAll: true,
  }));
}

/**
 * Returns whether an ended run's score is a new best: more points than any
 * run before at its speed.
 */
export function isNewBest(stats: Stats, run: EndedRun): boolean {
  return run.score > stats.speeds[run.speed].best;
}

/**
 * Returns what an ended run brings to the records but its speed: its score,
 * the wave it reached and the sector it started at.
 */
function endOf(
  run: Run,
  waves: readonly WaveEntry[],
): Pick<EndedRun, "score" | "wave" | "sector"> {
  return {
    score: run.score,
    wave: run.wave,
    sector: waveEntryOf(waves, run.firstWave).sector.id,
  };
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
function readSpeedStats(value: unknown): SpeedStats {
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
