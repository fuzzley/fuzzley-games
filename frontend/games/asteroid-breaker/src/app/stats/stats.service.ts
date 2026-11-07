import { Injectable, inject, signal } from "@angular/core";
import { LocalStorageService } from "@fz/ui/storage";
import { sectorSpans } from "../../rules/run/progress";
import {
  type EndedRun,
  type Stats,
  isNewBest,
  statsOf,
  withClearedAll,
  withRunEnded,
  withRunStarted,
  withStraysHome,
} from "../../rules/run/stats";
import type { Speed } from "../../rules/speed";
import { GAME_WAVES } from "../tokens";

/** Where the records are kept. Renaming it loses every player's. */
export const STATS_KEY = "asteroid-breaker-stats";

/** The shape the records are kept in; a reader drops any other. */
const STATS_VERSION = 1;

/**
 * Keeps the player's records at each speed: the runs, the best score, the
 * furthest wave, whether a run has cleared all thirty and the strays
 * brought home, and each sector's best run.
 */
@Injectable({ providedIn: "root" })
export class StatsService {
  private readonly storage = inject(LocalStorageService);
  private readonly state = signal<Stats>(
    statsOf(
      this.storage.readVersioned(STATS_KEY, STATS_VERSION),
      sectorSpans(inject(GAME_WAVES)).map(({ id }) => id),
    ),
  );

  /** The records so far. */
  readonly stats = this.state.asReadonly();

  /** Counts a run started at a speed. */
  recordStart(speed: Speed): void {
    this.keep(withRunStarted(this.state(), speed));
  }

  /**
   * Keeps an ended run's score and the wave it reached, and returns whether
   * the score is a new best: more points than any run before at its speed.
   */
  recordEnd(run: EndedRun): boolean {
    const newBest = isNewBest(this.state(), run);
    this.keep(withRunEnded(this.state(), run));
    return newBest;
  }

  /** Keeps that a run at a speed has cleared every written wave. */
  recordClearedAll(speed: Speed): void {
    this.keep(withClearedAll(this.state(), speed));
  }

  /** Counts strays brought home at a speed. */
  recordStrays(speed: Speed, strays: number): void {
    this.keep(withStraysHome(this.state(), speed, strays));
  }

  /** Holds the records and stores them, unless they are the ones held. */
  private keep(stats: Stats): void {
    if (stats === this.state()) return;
    this.state.set(stats);
    this.storage.writeVersioned(STATS_KEY, STATS_VERSION, stats);
  }
}
