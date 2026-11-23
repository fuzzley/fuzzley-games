// A wall game's records: how many runs have started, the best run's score,
// the furthest level reached, and each level's record once it is cleared.
// What a level's record holds, how it is read from storage and how a new
// result beats it are the game's own, in the StatsRules it hands in.

import { isCount, isRecord } from "@fz/core/json";
import type { IdentifiedLevel } from "./progress";
import { type LevelPlay, type Run, isLevelCleared } from "./run";

/** Holds a wall game's records, over what it keeps of a level cleared, `L`: the runs, and each level's record. */
export interface Stats<L> {
  /** Runs started: a run counts from its first round. */
  readonly runs: number;
  /** The best run's score. */
  readonly best: number;
  /** The furthest level a run has reached. */
  readonly furthest: number;
  /** Each level's record, by the level's id, once it is cleared. */
  readonly levels: Readonly<Record<string, L>>;
}

/** What an ended run brings to the records. */
export type EndedRun = Pick<Run<unknown>, "score" | "level">;

/** Describes the level a run has just cleared, as its records take it: as it was played, with its points, its stars' among them. */
export interface ClearedLevel<T> extends LevelPlay<T> {
  readonly points: number;
}

/** Holds what a wall game's records are handed of the game: how a level's record is read, made and beaten. */
export interface StatsRules<T, L, R extends L = L> {
  /** Returns a level's record as stored, or null for one that can't be a level's. */
  readonly readLevel: (value: unknown) => L | null;
  /** Returns what a level cleared, as a run played it, brings to its record. */
  readonly resultOf: (level: ClearedLevel<T>) => R;
  /** Returns a level's record with what a result beats of it taken from it, or the record itself where it beats none of it. */
  readonly merge: (kept: L, result: R) => L;
}

/** The records before any run. */
const NO_RUNS = { runs: 0, best: 0, furthest: 0 } as const;

/**
 * Returns the records as stored, keeping whatever of the runs' still makes
 * sense, and each level's as the game reads it, only for a level the game
 * still has.
 */
export function statsOf<L>(
  value: unknown,
  levels: readonly IdentifiedLevel[],
  rules: Pick<StatsRules<unknown, L>, "readLevel">,
): Stats<L> {
  const saved = isRecord(value) ? value : {};
  const { runs, best, furthest } = saved;
  const counted = isCount(runs) && isCount(best) && isCount(furthest);
  const stored = isRecord(saved["levels"]) ? saved["levels"] : {};
  return {
    ...(counted ? { runs, best, furthest } : NO_RUNS),
    levels: Object.fromEntries(
      levels.flatMap(({ data: { id } }) => {
        const kept = Object.hasOwn(stored, id)
          ? rules.readLevel(stored[id])
          : null;
        return kept === null ? [] : [[id, kept] as const];
      }),
    ),
  };
}

/** Returns the records with a run started counted. */
export function withRunStarted<L>(stats: Stats<L>): Stats<L> {
  return { ...stats, runs: stats.runs + 1 };
}

/**
 * Returns the records with an ended run's score and the level it reached
 * kept, or the same records if they beat neither; a run ended before any
 * was counted as started counts as one.
 */
export function withRunEnded<L>(stats: Stats<L>, run: EndedRun): Stats<L> {
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
export function isNewBest(
  stats: Pick<Stats<unknown>, "best">,
  run: Pick<EndedRun, "score">,
): boolean {
  return run.score > stats.best;
}

/**
 * Returns what the level a run has just cleared brings to its record, as
 * the game makes it, or null for a run whose level isn't cleared.
 */
export function levelResultOf<T, R>(
  run: Run<T>,
  rules: Pick<StatsRules<T, unknown, R>, "resultOf">,
): R | null {
  if (!isLevelCleared(run)) return null;
  const { level, depth, par, rounds, tally } = run;
  const points = run.score - run.banked;
  return rules.resultOf({ level, depth, par, rounds, tally, points });
}

/**
 * Returns the records with a level's result kept, by the level's id: as
 * its first record, or merged into the one it has, as the game merges
 * them; or the same records where it beats none of it.
 */
export function withLevelCleared<L, R extends L>(
  stats: Stats<L>,
  id: string,
  result: R,
  rules: Pick<StatsRules<unknown, L, R>, "merge">,
): Stats<L> {
  const kept = Object.hasOwn(stats.levels, id) ? stats.levels[id] : undefined;
  const merged = kept === undefined ? result : rules.merge(kept, result);
  if (merged === kept) return stats;
  return { ...stats, levels: { ...stats.levels, [id]: merged } };
}
