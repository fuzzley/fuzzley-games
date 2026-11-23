import { Injectable, InjectionToken, inject } from "@angular/core";
import { type KeptRun, keepRun } from "@fz/brick-wall/app/stored";
import type { RoundStart } from "../../rules/flight/events";
import {
  SAVED_GAME_VERSION,
  restoreGame,
  saveGame,
} from "../../rules/run/saved_game";
import type { LevelTally } from "../../rules/run/scoring";
import { GAME_LEVELS, GAME_MARKS } from "../tokens";

/** Where the run under way is kept. Renaming it loses every player's. */
const SAVED_GAME_KEY = "rickashay-game";

/** Describes what of the game the saved game reads, and how it hands a kept run back: `GameService`'s, which provides it as {@link KEPT_GAME}. */
export type KeptGame = KeptRun<LevelTally, RoundStart>;

/** The game the saved game keeps: `GameService`, through `useExisting`. */
export const KEPT_GAME = new InjectionToken<KeptGame>("KEPT_GAME");

/**
 * Keeps the run under way, and takes it up again, paused, when the page
 * loads, as `@fz/brick-wall/app/stored`'s `keepRun()` keeps a wall game's,
 * through the rules' `saveGame()` and `restoreGame()` and the levels'
 * marks; a page reloaded mid-flight comes back after the round, as
 * `saveGame()` keeps the run as it stands once the round lands. Something
 * must inject it at startup for the run to be taken up.
 */
@Injectable({ providedIn: "root" })
export class SavedGameService {
  constructor() {
    const levels = inject(GAME_LEVELS);
    const marks = inject(GAME_MARKS);
    keepRun(
      { key: SAVED_GAME_KEY, version: SAVED_GAME_VERSION },
      inject(KEPT_GAME),
      {
        save: (run, next, keeping) =>
          saveGame(run, next, levels, keeping, marks),
        restore: (saved, id) => restoreGame(saved, levels, id, marks),
      },
    );
  }
}
