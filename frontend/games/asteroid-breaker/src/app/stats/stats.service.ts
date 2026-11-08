import { Injectable, inject, signal } from "@angular/core";
import { LocalStorageService } from "@fz/ui/storage";
import { sectorSpans } from "../../rules/run/progress";
import {
  type RunRecords,
  type Stats,
  isNewBest,
  readStats,
  withRecords,
} from "../../rules/run/stats";
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
    readStats(
      this.storage.readVersioned(STATS_KEY, STATS_VERSION),
      sectorSpans(inject(GAME_WAVES)).map(({ id }) => id),
    ),
  );

  /** The records so far. */
  readonly stats = this.state.asReadonly();

  /**
   * Keeps what a change in a run brings to the records, and returns whether
   * the run it ends set a new best: more points than any run before at its
   * speed.
   */
  record(records: RunRecords): boolean {
    const { speed, ended } = records;
    const newBest =
      ended !== null && isNewBest(this.state(), { ...ended, speed });
    this.keep(withRecords(this.state(), records));
    return newBest;
  }

  /** Holds the records and stores them, unless they are the ones held. */
  private keep(stats: Stats): void {
    if (stats === this.state()) return;
    this.state.set(stats);
    this.storage.writeVersioned(STATS_KEY, STATS_VERSION, stats);
  }
}
