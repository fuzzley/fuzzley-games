import {
  type CountsById,
  countsByIdOf,
  isCount,
  isRecord,
  withHigherCount,
} from "@fz/core/json";
import { recordOf } from "@fz/core/records";
import { FIRST_LAYOUT } from "../levels/level";
import { type LevelData, type LevelEntry, layoutOf } from "../levels/levels";
import { SPEEDS, type Speed } from "../speed";
import type { Run } from "./run";

/** Counts one speed's runs. */
export interface SpeedStats {
  /** Runs started: a run counts from its first serve. */
  readonly runs: number;
  /** The best run's score. */
  readonly best: number;
  /** The furthest level a run has reached. */
  readonly furthest: number;
}

/** Holds the records: each speed's runs, and each level's bests. */
export interface Stats {
  readonly speeds: Readonly<Record<Speed, SpeedStats>>;
  /** Each level's best points at each speed it has been cleared at, by the level's id. */
  readonly levels: CountsById<Speed>;
  /**
   * The layout each level's bests were made on, by the level's id, for every
   * level with bests; stats stored without one were made on the first.
   */
  readonly layouts: Readonly<Record<string, number>>;
}

/** What an ended run brings to the stats. */
export type EndedRun = Pick<Run, "speed" | "score" | "level">;

const NO_RUNS: SpeedStats = { runs: 0, best: 0, furthest: 0 };

/**
 * Returns the stats as stored, keeping whatever of them still makes sense,
 * and the bests only of a level the game still has, made on the layout it
 * has now.
 */
export function statsOf(value: unknown, levels: readonly LevelEntry[]): Stats {
  const saved = isRecord(value) ? value : {};
  const speeds = isRecord(saved["speeds"]) ? saved["speeds"] : {};
  const asDrawn = levelsAsDrawn(saved["layouts"], levels);
  const bests = countsByIdOf(
    saved["levels"],
    asDrawn.map(({ id }) => id),
    SPEEDS,
  );
  return {
    speeds: recordOf(SPEEDS, (speed) => speedStatsOf(speeds[speed])),
    levels: bests,
    layouts: Object.fromEntries(
      asDrawn.flatMap((data) =>
        Object.hasOwn(bests, data.id) ? [[data.id, layoutOf(data)]] : [],
      ),
    ),
  };
}

/**
 * Returns the data of the levels whose stored bests, if any, were made on
 * the layout each has now, by the layouts stored, where a level with none
 * stored was on its first.
 */
function levelsAsDrawn(
  stored: unknown,
  levels: readonly LevelEntry[],
): LevelData[] {
  const madeOn = isRecord(stored) ? stored : {};
  return levels
    .map(({ data }) => data)
    .filter((data) => {
      const made = Object.hasOwn(madeOn, data.id)
        ? madeOn[data.id]
        : FIRST_LAYOUT;
      return made === layoutOf(data);
    });
}

/** Returns the stats with a run started at a speed counted. */
export function withRunStarted(stats: Stats, speed: Speed): Stats {
  return withSpeedStats(stats, speed, (speedStats) => ({
    ...speedStats,
    runs: speedStats.runs + 1,
  }));
}

/**
 * Returns the stats with an ended run's score and the level it reached
 * kept, or the same stats if they beat neither.
 */
export function withRunEnded(stats: Stats, run: EndedRun): Stats {
  const { runs, best, furthest } = stats.speeds[run.speed];
  if (runs >= 1 && run.score <= best && run.level <= furthest) return stats;
  return withSpeedStats(stats, run.speed, () => ({
    runs: Math.max(runs, 1),
    best: Math.max(best, run.score),
    furthest: Math.max(furthest, run.level),
  }));
}

/** Returns whether an ended run's score is a new best: more points than any run before at its speed. */
export function isNewBest(stats: Stats, run: EndedRun): boolean {
  return run.score > stats.speeds[run.speed].best;
}

/**
 * Returns the stats with a cleared level's points kept, and the layout they
 * were made on, if they are its best at the speed, or the same stats if
 * they aren't.
 */
export function withLevelPoints(
  stats: Stats,
  level: Pick<LevelData, "id" | "layout">,
  speed: Speed,
  points: number,
): Stats {
  const levels = withHigherCount(stats.levels, level.id, speed, points);
  if (levels === stats.levels) return stats;
  return {
    ...stats,
    levels,
    layouts: { ...stats.layouts, [level.id]: layoutOf(level) },
  };
}

/** Returns the stats with one speed's changed. */
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

/** Returns one speed's stats as stored, or none if they make no sense. */
function speedStatsOf(value: unknown): SpeedStats {
  if (!isRecord(value)) return NO_RUNS;
  const { runs, best, furthest } = value;
  if (!isCount(runs) || !isCount(best) || !isCount(furthest)) return NO_RUNS;
  return { runs, best, furthest };
}
