import { Injectable, inject } from "@angular/core";
import { keepSaved } from "@fz/ui/storage";
import { restoreRun, saveRun } from "../../rules/saved_run";
import { GameService } from "./game.service";

/** Where the run under way is kept. Renaming it loses every player's. */
export const SAVED_GAME_KEY = "snake-game";

/** The shape the run is kept in; a reader drops any other. */
const SAVED_GAME_VERSION = 1;

/**
 * Keeps the run under way, and takes it up again, paused, when the page
 * loads, so a reload or a phone dropping the tab loses little.
 *
 * Only a run under way is kept: one waiting for its first direction, or one
 * that has ended, is not. It is written as the run starts, pauses, goes on
 * or eats an apple, and as the page is hidden or goes away, rather than at
 * every step. Something must inject it at startup for the run to be taken
 * up.
 */
@Injectable({ providedIn: "root" })
export class SavedGameService {
  private readonly game = inject(GameService);

  constructor() {
    keepSaved({
      key: SAVED_GAME_KEY,
      version: SAVED_GAME_VERSION,
      save: () => saveRun(this.game.run()),
      restore: (saved) => {
        const run = restoreRun(saved, this.game.run().id + 1);
        if (run) this.game.takeUp(run);
      },
      track: () => {
        this.game.outcome();
        this.game.score();
        this.game.runs();
      },
    });
  }
}
