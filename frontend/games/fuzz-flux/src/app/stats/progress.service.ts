import { Injectable, inject } from "@angular/core";
import { StoredProgress } from "@fz/game-ui/levels";
import { GAME_LEVELS } from "../tokens";

/** Where the progress is kept. Renaming it loses every player's. */
const PROGRESS_KEY = "fuzz-flux-progress";

/** The shape the progress is kept in; a reader drops any other. */
const PROGRESS_VERSION = 1;

/**
 * Keeps the levels the player has cleared, which open the levels after them
 * (C4), as `@fz/game-ui/levels`' `StoredProgress` keeps a game's.
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
