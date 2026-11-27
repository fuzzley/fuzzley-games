import { Injectable, inject } from "@angular/core";
import { StoredProgress } from "@fz/game-ui/levels";
import { GAME_LEVELS } from "../tokens";

/** Where the progress is kept. Renaming it loses every player's. */
const PROGRESS_KEY = "rickashay-progress";

/** The shape the progress is kept in; a reader drops any other. */
const PROGRESS_VERSION = 1;

/**
 * Keeps the levels the player has cleared, which open the levels after them,
 * as `@fz/game-ui/levels`' `StoredProgress` keeps a game's.
 *
 * Hand it only levels cleared on the record: a run the debug menu took off
 * the record keeps none, here or in the stats.
 */
@Injectable({ providedIn: "root" })
export class ProgressService extends StoredProgress {
  constructor() {
    super(
      { key: PROGRESS_KEY, version: PROGRESS_VERSION },
      inject(GAME_LEVELS),
    );
  }
}
