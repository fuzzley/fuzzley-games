import { isCount, isRecord } from "@fz/core/json";
import type { LevelEntry } from "./levels";
import type { Run } from "./run";
import { SPEEDS, type Speed } from "./speed";
import { recordOf } from "./tables";

/** Counts one speed's runs. */
export interface SpeedStats {
  /** Runs started: a run counts from its first serve. */
  readonly runs: number;
  /** The best run's score. */
  readonly best: number;
  /** The furthest level a run has reached. */
  readonly furthest: number;
}

/** A level's best points at each speed it has been cleared at. */
export type LevelBests = Readonly<Partial<Record<Speed, number>>>;

/** Holds the records: each speed's runs, and each level's bests. */
export interface Stats {
  readonly speeds: Readonly<Record<Speed, SpeedStats>>;
  /** Each level's bests, by the level's id. */
  readonly levels: Readonly<Record<string, LevelBests>>;
}

/** What an ended run brings to the stats. */
export type EndedRun = Pick<Run, "speed" | "score" | "level">;

const NO_RUNS: SpeedStats = { runs: 0, best: 0, furthest: 0 };

/**
 * Returns the stats as stored, keeping whatever of them still makes sense,
 * and the bests only of a level the game still has.
 */
export function statsOf(value: unknown, levels: readonly LevelEntry[]): Stats {
  const saved = isRecord(value) ? value : {};
  const speeds = isRecord(saved["speeds"]) ? saved["speeds"] : {};
  const stored = isRecord(saved["levels"]) ? saved["levels"] : {};
  return {
    speeds: recordOf(SPEEDS, (speed) => speedStatsOf(speeds[speed])),
    levels: Object.fromEntries(
      levels.flatMap(({ data: { id } }) => {
        const bests = levelBestsOf(stored[id]);
        return bests ? [[id, bests]] : [];
      }),
    ),
  };
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
 * Returns the stats with a cleared level's points kept, if they are its
 * best at the speed, or the same stats if they aren't.
 */
export function withLevelPoints(
  stats: Stats,
  id: string,
  speed: Speed,
  points: number,
): Stats {
  const bests = stats.levels[id] ?? {};
  if (points <= (bests[speed] ?? -1)) return stats;
  return {
    ...stats,
    levels: { ...stats.levels, [id]: { ...bests, [speed]: points } },
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

/** Returns a level's bests as stored, each that makes sense, or null with none. */
function levelBestsOf(value: unknown): LevelBests | null {
  if (!isRecord(value)) return null;
  const bests: Partial<Record<Speed, number>> = {};
  for (const speed of SPEEDS) {
    const points = value[speed];
    if (isCount(points)) bests[speed] = points;
  }
  return Object.keys(bests).length > 0 ? bests : null;
}
