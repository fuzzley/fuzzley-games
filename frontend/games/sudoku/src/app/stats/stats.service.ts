import { Injectable, inject, signal } from "@angular/core";
import { LocalStorageService } from "@fz/ui/storage";
import type { Level } from "../../rules/difficulty";
import { isCount, isRecord } from "@fz/core/json";

/** Where the stats are kept. Renaming it loses every player's. */
export const STATS_KEY = "sudoku-stats";

/** The shape the stats are kept in; a reader drops any other. */
const STATS_VERSION = 1;

/** Counts one level's games. */
export interface LevelStats {
  /** Games started: a game counts from its first digit or note. */
  readonly played: number;
  readonly solved: number;
  /** The fastest solve without a hint, in seconds, or null before the first. */
  readonly best: number | null;
}

/** Counts the games of each level. */
export type Stats = Readonly<Record<Level, LevelStats>>;

const NONE: LevelStats = { played: 0, solved: 0, best: null };

/** Returns stats for every level, each from a function of its id. */
function statsBy(each: (level: Level) => LevelStats): Stats {
  return {
    easy: each("easy"),
    medium: each("medium"),
    hard: each("hard"),
    expert: each("expert"),
  };
}

/**
 * Keeps the player's games played and solved, and their best times, for
 * each level.
 *
 * A puzzle solved with a hint counts as solved but sets no best time.
 */
@Injectable({ providedIn: "root" })
export class StatsService {
  private readonly storage = inject(LocalStorageService);
  private readonly state = signal<Stats>(this.read());

  /** The stats so far. */
  readonly stats = this.state.asReadonly();

  /** Counts a game started. */
  recordStart(level: Level): void {
    this.change(level, (stats) => ({ ...stats, played: stats.played + 1 }));
  }

  /**
   * Counts a game solved, and returns whether its time is a new best.
   *
   * A solve counts as played too where its start went uncounted, as a game
   * saved by another tab can be, since stored stats with more games solved
   * than played are thrown away as broken.
   */
  recordSolve(level: Level, seconds: number, hints: number): boolean {
    const before = this.state()[level].best;
    const counts = hints === 0;
    const best = counts ? Math.min(before ?? seconds, seconds) : before;
    this.change(level, (stats) => ({
      played: Math.max(stats.played, stats.solved + 1),
      solved: stats.solved + 1,
      best,
    }));
    return counts && (before === null || seconds < before);
  }

  private change(
    level: Level,
    update: (stats: LevelStats) => LevelStats,
  ): void {
    this.state.update((all) => ({ ...all, [level]: update(all[level]) }));
    this.storage.writeVersioned(STATS_KEY, STATS_VERSION, this.state());
  }

  /** Returns the stats stored, keeping whatever of them still makes sense. */
  private read(): Stats {
    const saved = this.storage.readVersioned(STATS_KEY, STATS_VERSION);
    if (!saved) return statsBy(() => NONE);
    return statsBy((level) => parseStats(saved[level]));
  }
}

/** Returns one level's stats as stored, or none if they make no sense. */
function parseStats(value: unknown): LevelStats {
  if (!isRecord(value)) return NONE;
  const { played, solved, best } = value;
  if (!isCount(played) || !isCount(solved) || solved > played) {
    return NONE;
  }
  const time = isCount(best) && solved > 0 ? best : null;
  return { played, solved, best: time };
}
