import { Injectable, inject } from "@angular/core";
import { keepSaved } from "@fz/ui/storage";
import { SAVED_GAME_VERSION, restoreGame } from "../../rules/run/saved_game";
import { GAME_WAVES } from "../tokens";
import { GameService } from "./game.service";

/** Where the run under way is kept. Renaming it loses every player's. */
export const SAVED_GAME_KEY = "asteroid-breaker-game";

/**
 * Keeps the run under way, and takes it up again, paused, when the page
 * loads, so a reload or a phone dropping the tab loses little.
 *
 * It writes as the run changes course and as the page is hidden or goes
 * away, never at a step, and something must inject it at startup for the
 * run to be taken up.
 */
@Injectable({ providedIn: "root" })
export class SavedGameService {
  private readonly game = inject(GameService);
  private readonly waves = inject(GAME_WAVES);

  constructor() {
    keepSaved({
      key: SAVED_GAME_KEY,
      version: SAVED_GAME_VERSION,
      save: () => this.game.saved(),
      restore: (saved) => {
        const takenUp = restoreGame(saved, this.waves, this.game.run().id + 1);
        if (takenUp) this.game.takeUp(takenUp);
      },
      track: () => {
        this.game.runs();
        this.game.outcome();
        this.game.crew();
      },
    });
  }
}
