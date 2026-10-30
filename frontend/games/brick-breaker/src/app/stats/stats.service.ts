import { Injectable, inject, signal } from "@angular/core";
import { LocalStorageService } from "@fz/ui/storage";
import type { Speed } from "../../rules/speed";
import {
  type EndedRun,
  type Stats,
  isNewBest,
  statsOf,
  withLevelPoints,
  withRunEnded,
  withRunStarted,
} from "../../rules/stats";
import { GAME_LEVELS } from "../tokens";

/** Where the stats are kept. Renaming it loses every player's. */
export const STATS_KEY = "brick-breaker-stats";

/** The shape the stats are kept in; a reader drops any other. */
const STATS_VERSION = 1;

/** Keeps the player's runs, best scores and furthest levels at each speed, and each level's best points. */
@Injectable({ providedIn: "root" })
export class StatsService {
  private readonly storage = inject(LocalStorageService);
  private readonly state = signal<Stats>(
    statsOf(
      this.storage.readVersioned(STATS_KEY, STATS_VERSION),
      inject(GAME_LEVELS),
    ),
  );

  /** The stats so far. */
  readonly stats = this.state.asReadonly();

  /** Counts a run started at a speed. */
  recordStart(speed: Speed): void {
    this.keep(withRunStarted(this.state(), speed));
  }

  /**
   * Keeps an ended run's score and the level it reached, and returns whether
   * the score is a new best: more points than any run before at its speed.
   */
  recordEnd(run: EndedRun): boolean {
    const newBest = isNewBest(this.state(), run);
    this.keep(withRunEnded(this.state(), run));
    return newBest;
  }

  /** Keeps a cleared level's points, if they are its best at the speed. */
  recordLevel(id: string, speed: Speed, points: number): void {
    this.keep(withLevelPoints(this.state(), id, speed, points));
  }

  /** Holds the stats and stores them, unless they are the ones held. */
  private keep(stats: Stats): void {
    if (stats === this.state()) return;
    this.state.set(stats);
    this.storage.writeVersioned(STATS_KEY, STATS_VERSION, stats);
  }
}
