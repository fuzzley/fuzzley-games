import { Injectable } from "@angular/core";
import { storedSignal } from "@fz/ui/storage";
import { LEVELS } from "../../rules/levels/levels";
import {
  type EndedRun,
  type LevelResult,
  isNewBest,
  statsOf,
  withLevelCleared,
  withRunEnded,
  withRunStarted,
} from "../../rules/run/stats";

/** Where the stats are kept. Renaming it loses every player's. */
const STATS_KEY = "brick-fuzz-pop-stats";

/** The shape the stats are kept in; a reader drops any other. */
const STATS_VERSION = 1;

/**
 * Keeps the player's runs, the best run's score and the furthest level
 * reached, and each level's best points, fewest rounds and most stars.
 *
 * Hand it only runs played on the numbers the game ships: a run on numbers
 * the debug menu retuned keeps no records, here or in the progress.
 */
@Injectable({ providedIn: "root" })
export class StatsService {
  private readonly state = storedSignal({
    key: STATS_KEY,
    version: STATS_VERSION,
    read: (saved) => statsOf(saved, LEVELS),
  });

  /** The stats so far. */
  readonly stats = this.state.asReadonly();

  /** Counts a run started, as it plays its first round. */
  recordStart(): void {
    this.state.set(withRunStarted(this.state()));
  }

  /**
   * Keeps an ended run's score and the level it reached, and returns whether
   * the score is a new best: more points than any run before, asked before
   * the score is kept.
   */
  recordEnd(run: EndedRun): boolean {
    const newBest = isNewBest(this.state(), run);
    this.state.set(withRunEnded(this.state(), run));
    return newBest;
  }

  /** Keeps a cleared level's points, rounds and stars, by its id, each that beats its record. */
  recordLevel(id: string, result: LevelResult): void {
    this.state.set(withLevelCleared(this.state(), id, result));
  }
}
