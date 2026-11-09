import { Injectable, inject } from "@angular/core";
import { storedSignal } from "@fz/ui/storage";
import {
  type EndedRun,
  isNewBest,
  statsOf,
  withLevelPoints,
  withRunEnded,
  withRunStarted,
} from "../../rules/run/stats";
import type { Speed } from "../../rules/speed";
import { GAME_LEVELS } from "../tokens";

/** Where the stats are kept. Renaming it loses every player's. */
export const STATS_KEY = "brick-breaker-stats";

/** The shape the stats are kept in; a reader drops any other. */
const STATS_VERSION = 1;

/** Keeps the player's runs, best scores and furthest levels at each speed, and each level's best points. */
@Injectable({ providedIn: "root" })
export class StatsService {
  private readonly levels = inject(GAME_LEVELS);
  private readonly state = storedSignal({
    key: STATS_KEY,
    version: STATS_VERSION,
    read: (saved) => statsOf(saved, this.levels),
  });

  /** The stats so far. */
  readonly stats = this.state.asReadonly();

  /** Counts a run started at a speed. */
  recordStart(speed: Speed): void {
    this.state.set(withRunStarted(this.state(), speed));
  }

  /**
   * Keeps an ended run's score and the level it reached, and returns whether
   * the score is a new best: more points than any run before at its speed.
   */
  recordEnd(run: EndedRun): boolean {
    const newBest = isNewBest(this.state(), run);
    this.state.set(withRunEnded(this.state(), run));
    return newBest;
  }

  /** Keeps a cleared level's points, if they are its best at the speed. */
  recordLevel(id: string, speed: Speed, points: number): void {
    this.state.set(withLevelPoints(this.state(), id, speed, points));
  }
}
