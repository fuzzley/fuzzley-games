import { Injectable, inject } from "@angular/core";
import { StoredStats } from "@fz/brick-wall/app/stored";
import {
  type LevelRecords,
  type LevelResult,
  STATS_RULES,
} from "../../rules/run/stats";
import { GAME_LEVELS } from "../tokens";

/** Where the stats are kept. Renaming it loses every player's. */
const STATS_KEY = "brick-fuzz-pop-stats";

/** The shape the stats are kept in; a reader drops any other. */
const STATS_VERSION = 1;

/**
 * Keeps the player's runs, the best run's score and the furthest level
 * reached, and each level's best points, fewest rounds and most stars, as
 * `@fz/brick-wall/app/stored`'s `StoredStats` keeps a wall game's records.
 *
 * Hand it only runs played on the record: a run the debug menu took off the
 * record keeps none, here or in the progress.
 */
@Injectable({ providedIn: "root" })
export class StatsService extends StoredStats<LevelRecords, LevelResult> {
  constructor() {
    super(
      { key: STATS_KEY, version: STATS_VERSION },
      inject(GAME_LEVELS),
      STATS_RULES,
    );
  }
}
