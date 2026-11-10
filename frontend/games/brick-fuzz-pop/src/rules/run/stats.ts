import {
  type CountsById,
  countsByIdOf,
  isCount,
  isRecord,
  withHigherCount,
} from "@fz/core/json";
import type { LevelEntry } from "../levels/levels";
import type { Run } from "./run";
import { MOST_STARS, starsOf } from "./stars";

/** The records kept of each level cleared: its best points, its fewest rounds and its most stars. */
export const LEVEL_RECORDS = ["points", "rounds", "stars"] as const;

/** Names a record kept of a level cleared. */
export type LevelRecord = (typeof LEVEL_RECORDS)[number];

/** Holds the records: the runs, and each level's bests. */
export interface Stats {
  /** Runs started: a run counts from its first round. */
  readonly runs: number;
  /** The best run's score. */
  readonly best: number;
  /** The furthest level a run has reached. */
  readonly furthest: number;
  /** Each level's records, by the level's id, once it is cleared. */
  readonly levels: CountsById<LevelRecord>;
}

/** What an ended run brings to the stats. */
export type EndedRun = Pick<Run, "score" | "level">;

/** What a level cleared brings to its records: its points, its stars' among them, its rounds and its stars. */
export type LevelResult = Readonly<Record<LevelRecord, number>>;

/** The stats before any run. */
const NO_RUNS: Stats = { runs: 0, best: 0, furthest: 0, levels: {} };

/**
 * Returns the stats as stored, keeping whatever of them still makes sense,
 * and the records only of a level the game still has, dropping a level's
 * whose rounds or stars no level clears in or earns.
 */
export function statsOf(value: unknown, levels: readonly LevelEntry[]): Stats {
  const saved = isRecord(value) ? value : {};
  const { runs, best, furthest } = saved;
  const counted = isCount(runs) && isCount(best) && isCount(furthest);
  const kept = countsByIdOf(
    saved["levels"],
    levels.map(({ data: { id } }) => id),
    LEVEL_RECORDS,
  );
  return {
    ...(counted ? { runs, best, furthest } : NO_RUNS),
    levels: Object.fromEntries(
      Object.entries(kept).filter(([, records]) => isSound(records)),
    ),
  };
}

/** Returns the stats with a run started counted. */
export function withRunStarted(stats: Stats): Stats {
  return { ...stats, runs: stats.runs + 1 };
}

/**
 * Returns the stats with an ended run's score and the level it reached
 * kept, or the same stats if they beat neither.
 */
export function withRunEnded(stats: Stats, run: EndedRun): Stats {
  const { runs, best, furthest } = stats;
  if (runs >= 1 && run.score <= best && run.level <= furthest) return stats;
  return {
    ...stats,
    runs: Math.max(runs, 1),
    best: Math.max(best, run.score),
    furthest: Math.max(furthest, run.level),
  };
}

/** Returns whether an ended run's score is a new best: more points than any run before. */
export function isNewBest(stats: Stats, run: EndedRun): boolean {
  return run.score > stats.best;
}

/** Returns what the level a run has just cleared brings to its records, or null for a run whose level isn't cleared. */
export function levelResultOf(run: Run): LevelResult | null {
  const stars = starsOf(run);
  if (stars === 0) return null;
  return { points: run.score - run.banked, rounds: run.rounds, stars };
}

/**
 * Returns the stats with a cleared level's points, rounds and stars kept,
 * each that beats its record, or the same stats if none does.
 */
export function withLevelCleared(
  stats: Stats,
  id: string,
  { points, rounds, stars }: LevelResult,
): Stats {
  const best = withHigherCount<LevelRecord>(stats.levels, id, "points", points);
  const fewest = withLowerCount<LevelRecord>(best, id, "rounds", rounds);
  const levels = withHigherCount<LevelRecord>(fewest, id, "stars", stars);
  return levels === stats.levels ? stats : { ...stats, levels };
}

/** Returns whether a level's records kept could be a level's: cleared in a round or more, with one to three stars. */
function isSound({
  rounds = 1,
  stars = 1,
}: Partial<Record<LevelRecord, number>>): boolean {
  return rounds >= 1 && stars >= 1 && stars <= MOST_STARS;
}

/**
 * Returns the counts with an id's count under a key lowered to a value
 * lower than the one kept, as the fewest rounds is beaten, or the same
 * counts for a value no lower: `@fz/core/json`'s `withHigherCount()` the
 * other way up, which only this game's records need.
 */
function withLowerCount<K extends string>(
  counts: CountsById<K>,
  id: string,
  key: K,
  value: number,
): CountsById<K> {
  const kept = counts[id];
  if (value >= (kept?.[key] ?? Infinity)) return counts;
  const lowered: Partial<Record<K, number>> = { ...kept };
  lowered[key] = value;
  return { ...counts, [id]: lowered };
}
