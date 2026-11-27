import { Injectable, inject } from "@angular/core";
import { type CountsById, countsByIdOf } from "@fz/core/json";
import { itemAt } from "@fz/core/records";
import { storedSignal } from "@fz/ui/storage";
import type { Level } from "../../rules/levels/level";
import { GAME_LEVELS } from "../tokens";

/** Where each level's record is kept. Renaming it loses every player's. */
const RECORDS_KEY = "fuzz-flux-records";

/** The shape the records are kept in; an entry of any other is read as none. */
const RECORDS_VERSION = 1;

/** What a level's record counts: the place among its deals of the one it begins on next. */
const RECORD_COUNTS = ["nextDeal"] as const;

/** Holds each level's record by its id, a level with none left out. */
type LevelRecords = CountsById<(typeof RECORD_COUNTS)[number]>;

/** Describes the records as they are kept. */
interface Records {
  readonly levels: LevelRecords;
}

/**
 * Keeps each level's record: the deal it begins on next, which the first
 * move made on a deal uses up, so Try again, Play again and coming back to
 * a level play the next of its deals, and a deal no move was made on is
 * played again.
 */
@Injectable({ providedIn: "root" })
export class RecordsService {
  /** The ids of the game's levels, whose records alone are read. */
  private readonly levelIds = inject(GAME_LEVELS).map(({ data }) => data.id);

  private readonly records = storedSignal<Records>({
    key: RECORDS_KEY,
    version: RECORDS_VERSION,
    read: (saved) => ({
      levels: countsByIdOf(saved?.["levels"], this.levelIds, RECORD_COUNTS),
    }),
  });

  /** Returns the seed of the deal a level begins on next: its first, until a move is made on it. */
  nextDeal(level: Level): number {
    return itemAt(level.deals, this.nextPlace(level));
  }

  /**
   * Uses up a level's deal as the first move is made on it, where it is the
   * one the level was to begin on next, so the level begins next on the one
   * after it, its first after its last.
   */
  dealUsed(level: Level, seed: number): void {
    const place = this.nextPlace(level);
    if (itemAt(level.deals, place) !== seed) return;
    const nextDeal = (place + 1) % level.deals.length;
    this.records.update(({ levels }) => ({
      levels: { ...levels, [level.id]: { ...levels[level.id], nextDeal } },
    }));
  }

  /** Returns the place among a level's deals of the one it begins on next. */
  private nextPlace(level: Level): number {
    const place = this.records().levels[level.id]?.nextDeal ?? 0;
    return place % level.deals.length;
  }
}
