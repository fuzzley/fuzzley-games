import { Injectable, inject, signal } from "@angular/core";
import { isRecord, isWhole } from "@fz/core/json";
import { LocalStorageService } from "@fz/ui/storage";
import type { Speed } from "../../rules/speed";

/** Where the stats are kept. Renaming it loses every player's. */
export const STATS_KEY = "snake-stats";

/** The shape the stats are kept in; a reader drops any other. */
const STATS_VERSION = 1;

/** Counts one speed's runs. */
export interface SpeedStats {
  /** Runs started: a run counts from its first direction. */
  readonly runs: number;
  /** The most apples eaten in one run. */
  readonly best: number;
  /** The longest the snake has grown, in squares. */
  readonly longest: number;
}

/** Counts the runs of each speed. */
export type Stats = Readonly<Record<Speed, SpeedStats>>;

const NONE: SpeedStats = { runs: 0, best: 0, longest: 0 };

/** Returns stats for every speed, each from a function of it. */
function statsBy(each: (speed: Speed) => SpeedStats): Stats {
  return {
    slow: each("slow"),
    normal: each("normal"),
    fast: each("fast"),
  };
}

/** Keeps the player's runs, best scores and longest snakes, for each speed. */
@Injectable({ providedIn: "root" })
export class StatsService {
  private readonly storage = inject(LocalStorageService);
  private readonly state = signal<Stats>(this.read());

  /** The stats so far. */
  readonly stats = this.state.asReadonly();

  /** Counts a run started. */
  recordStart(speed: Speed): void {
    this.change(speed, (stats) => ({ ...stats, runs: stats.runs + 1 }));
  }

  /**
   * Keeps a run's score and length as it ends, and returns whether the score
   * is a new best: more apples than any run before at its speed.
   */
  recordEnd(speed: Speed, score: number, length: number): boolean {
    const before = this.state()[speed].best;
    this.change(speed, (stats) => ({
      runs: Math.max(stats.runs, 1),
      best: Math.max(stats.best, score),
      longest: Math.max(stats.longest, length),
    }));
    return score > before;
  }

  private change(
    speed: Speed,
    update: (stats: SpeedStats) => SpeedStats,
  ): void {
    this.state.update((all) => ({ ...all, [speed]: update(all[speed]) }));
    this.storage.writeVersioned(STATS_KEY, STATS_VERSION, this.state());
  }

  /** Returns the stats stored, keeping whatever of them still makes sense. */
  private read(): Stats {
    const saved = this.storage.readVersioned(STATS_KEY, STATS_VERSION);
    if (!saved) return statsBy(() => NONE);
    return statsBy((speed) => parseStats(saved[speed]));
  }
}

/** Returns one speed's stats as stored, or none if they make no sense. */
function parseStats(value: unknown): SpeedStats {
  if (!isRecord(value)) return NONE;
  const { runs, best, longest } = value;
  if (!isWhole(runs) || !isWhole(best) || !isWhole(longest)) return NONE;
  if (runs < 0 || best < 0 || longest < 0) return NONE;
  return { runs, best, longest };
}
