import { Injectable, inject } from "@angular/core";
import { storedSignal } from "@fz/ui/storage";
import type { Level } from "../../rules/levels/level";
import {
  type LevelRecords,
  levelRecordsOf,
  nextDealOf,
  withCleared,
  withDealUsed,
} from "../../rules/run/records";
import { GAME_LEVELS } from "../tokens";

/** Where each level's record is kept. Renaming it loses every player's. */
const RECORDS_KEY = "fuzz-flux-records";

/** The shape the records are kept in; an entry of any other is read as none. */
const RECORDS_VERSION = 1;

/** Describes the records as they are kept. */
interface Records {
  readonly levels: LevelRecords;
}

/**
 * Keeps each level's record, as `rules/run/records` has it: the deal it
 * begins on next, its most stars and its most moves to spare.
 */
@Injectable({ providedIn: "root" })
export class RecordsService {
  /** The ids of the game's levels, whose records alone are read. */
  private readonly levelIds = inject(GAME_LEVELS).map(({ data }) => data.id);

  private readonly records = storedSignal<Records>({
    key: RECORDS_KEY,
    version: RECORDS_VERSION,
    read: (saved) => ({
      levels: levelRecordsOf(saved?.["levels"], this.levelIds),
    }),
  });

  /** Returns the seed of the deal a level begins on next: its first, until a move is made on it. */
  nextDeal(level: Level): number {
    return nextDealOf(this.records().levels, level);
  }

  /** Uses up a level's deal as the first move is made on it, where it is the one it was to begin on next. */
  dealUsed(level: Level, seed: number): void {
    this.records.update(({ levels }) => ({
      levels: withDealUsed(levels, level, seed),
    }));
  }

  /** Keeps a level cleared with so many stars and moves to spare, where the game beats its record. */
  cleared(level: Level, stars: number, spare: number): void {
    this.records.update(({ levels }) => ({
      levels: withCleared(levels, level, stars, spare),
    }));
  }
}
