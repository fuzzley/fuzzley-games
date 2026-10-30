import { Injectable, inject, signal } from "@angular/core";
import { isCount, isRecord } from "@fz/core/json";
import { LocalStorageService } from "@fz/ui/storage";
import type { Run } from "../../rules/run";
import { SPEEDS, type Speed } from "../../rules/speed";
import { GAME_LEVELS } from "../tokens";

/** Where the stats are kept. Renaming it loses every player's. */
export const STATS_KEY = "brick-breaker-stats";

/** The shape the stats are kept in; a reader drops any other. */
const STATS_VERSION = 1;

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

const NONE: SpeedStats = { runs: 0, best: 0, furthest: 0 };

/** Returns stats for every speed, each from a function of it. */
function speedsBy(each: (speed: Speed) => SpeedStats): Stats["speeds"] {
  return {
    relaxed: each("relaxed"),
    normal: each("normal"),
    fast: each("fast"),
  };
}

/** Keeps the player's runs, best scores and furthest levels at each speed, and each level's best points. */
@Injectable({ providedIn: "root" })
export class StatsService {
  private readonly storage = inject(LocalStorageService);
  private readonly levels = inject(GAME_LEVELS);
  private readonly state = signal<Stats>(this.read());

  /** The stats so far. */
  readonly stats = this.state.asReadonly();

  /** Counts a run started at a speed. */
  recordStart(speed: Speed): void {
    this.changeSpeedStats(speed, (stats) => ({
      ...stats,
      runs: stats.runs + 1,
    }));
  }

  /**
   * Keeps an ended run's score and the level it reached, and returns whether
   * the score is a new best: more points than any run before at its speed.
   */
  recordEnd(run: Run): boolean {
    const before = this.state().speeds[run.speed].best;
    this.changeSpeedStats(run.speed, (stats) => ({
      runs: Math.max(stats.runs, 1),
      best: Math.max(stats.best, run.score),
      furthest: Math.max(stats.furthest, run.level),
    }));
    return run.score > before;
  }

  /** Keeps a cleared level's points, if they are its best at the speed. */
  recordLevel(id: string, speed: Speed, points: number): void {
    const bests = this.state().levels[id] ?? {};
    if (points <= (bests[speed] ?? -1)) return;
    this.change((stats) => ({
      ...stats,
      levels: { ...stats.levels, [id]: { ...bests, [speed]: points } },
    }));
  }

  private changeSpeedStats(
    speed: Speed,
    update: (stats: SpeedStats) => SpeedStats,
  ): void {
    this.change((stats) => ({
      ...stats,
      speeds: { ...stats.speeds, [speed]: update(stats.speeds[speed]) },
    }));
  }

  private change(update: (stats: Stats) => Stats): void {
    this.state.update(update);
    this.storage.writeVersioned(STATS_KEY, STATS_VERSION, this.state());
  }

  /** Returns the stats stored, keeping whatever of them still makes sense. */
  private read(): Stats {
    const saved = this.storage.readVersioned(STATS_KEY, STATS_VERSION);
    const speeds = isRecord(saved?.["speeds"]) ? saved["speeds"] : {};
    const levels = isRecord(saved?.["levels"]) ? saved["levels"] : {};
    const known = this.levels.map((entry) => entry.data.id);
    return {
      speeds: speedsBy((speed) => parseSpeedStats(speeds[speed])),
      levels: Object.fromEntries(
        known.flatMap((id) => {
          const bests = parseLevelBests(levels[id]);
          return bests ? [[id, bests]] : [];
        }),
      ),
    };
  }
}

/** Returns one speed's stats as stored, or none if they make no sense. */
function parseSpeedStats(value: unknown): SpeedStats {
  if (!isRecord(value)) return NONE;
  const { runs, best, furthest } = value;
  if (!isCount(runs) || !isCount(best) || !isCount(furthest)) return NONE;
  return { runs, best, furthest };
}

/** Returns a level's bests as stored, each that makes sense, or null with none. */
function parseLevelBests(value: unknown): LevelBests | null {
  if (!isRecord(value)) return null;
  const bests: Partial<Record<Speed, number>> = {};
  for (const speed of SPEEDS) {
    const points = value[speed];
    if (isCount(points)) bests[speed] = points;
  }
  return Object.keys(bests).length > 0 ? bests : null;
}
