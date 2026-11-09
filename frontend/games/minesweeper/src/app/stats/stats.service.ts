import { Injectable } from "@angular/core";
import { type StoredFields, storedSignal } from "@fz/ui/storage";
import { DIFFICULTY_IDS, type DifficultyId } from "../../rules/difficulty";
import { isCount, isRecord } from "@fz/core/json";
import { recordOf } from "@fz/core/records";

/** Where the stats are kept. Renaming it loses every player's. */
export const STATS_KEY = "minesweeper-stats";

/** The shape the stats are kept in; a reader drops any other. */
const STATS_VERSION = 1;

/** Counts one difficulty's games. */
export interface DifficultyStats {
  /** Games started: a game counts once its first square is revealed. */
  readonly played: number;
  readonly won: number;
  /** The fastest win, in seconds, or null before the first. */
  readonly best: number | null;
}

/** Counts the games of each difficulty. */
export type Stats = Readonly<Record<DifficultyId, DifficultyStats>>;

const NONE: DifficultyStats = { played: 0, won: 0, best: null };

/**
 * Keeps the player's games played and won, and their best times, for each
 * difficulty.
 *
 * Custom's fields differ from one game to the next, so Custom keeps no best
 * time.
 */
@Injectable({ providedIn: "root" })
export class StatsService {
  private readonly state = storedSignal({
    key: STATS_KEY,
    version: STATS_VERSION,
    read: statsFrom,
  });

  /** The stats so far. */
  readonly stats = this.state.asReadonly();

  /** Counts a game started. */
  recordStart(difficulty: DifficultyId): void {
    this.change(difficulty, (stats) => ({
      ...stats,
      played: stats.played + 1,
    }));
  }

  /**
   * Counts a game won, and returns whether its time is a new best.
   *
   * A win counts as played too where its start went uncounted, as a game
   * saved by another tab can be, since stored stats with more games won than
   * played are thrown away as broken.
   */
  recordWin(difficulty: DifficultyId, seconds: number): boolean {
    const before = this.state()[difficulty].best;
    const best =
      difficulty === "custom" ? null : Math.min(before ?? seconds, seconds);
    this.change(difficulty, (stats) => ({
      played: Math.max(stats.played, stats.won + 1),
      won: stats.won + 1,
      best,
    }));
    return difficulty !== "custom" && (before === null || seconds < before);
  }

  private change(
    difficulty: DifficultyId,
    update: (stats: DifficultyStats) => DifficultyStats,
  ): void {
    this.state.update((all) => ({
      ...all,
      [difficulty]: update(all[difficulty]),
    }));
  }
}

/** Returns the stats stored, keeping whatever of them still makes sense. */
function statsFrom(saved: StoredFields | null): Stats {
  return recordOf(DIFFICULTY_IDS, (id) => parseStats(saved?.[id]));
}

/** Returns one difficulty's stats as stored, or none if they make no sense. */
function parseStats(value: unknown): DifficultyStats {
  if (!isRecord(value)) return NONE;
  const { played, won, best } = value;
  if (!isCount(played) || !isCount(won) || won > played) {
    return NONE;
  }
  const time = isCount(best) && won > 0 ? best : null;
  return { played, won, best: time };
}
