import { Injectable, inject } from "@angular/core";
import { StoredStats } from "@fz/brick-wall/app/stored";
import { type LevelRecord, statsRulesOf } from "../../rules/run/stats";
import { GAME_LEVELS, GAME_MARKS } from "../tokens";

/** Where the stats are kept. Renaming it loses every player's. */
const STATS_KEY = "rickashay-stats";

/** The shape the stats are kept in; a reader drops any other. */
const STATS_VERSION = 1;

/**
 * Keeps the player's runs, the best run's score and the furthest level
 * reached, and each level's best points, fewest rounds, best rally and
 * stars, as `@fz/brick-wall/app/stored`'s `StoredStats` keeps a wall game's
 * records.
 *
 * Hand it only runs played on the record: a run the debug menu took off the
 * record keeps none, here or in the progress.
 */
@Injectable({ providedIn: "root" })
export class StatsService extends StoredStats<LevelRecord, LevelRecord> {
  constructor() {
    const levels = inject(GAME_LEVELS);
    super(
      { key: STATS_KEY, version: STATS_VERSION },
      levels,
      statsRulesOf(levels, inject(GAME_MARKS)),
    );
  }
}
