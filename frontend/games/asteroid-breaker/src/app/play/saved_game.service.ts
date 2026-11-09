import { Injectable, effect, inject, untracked } from "@angular/core";
import { LocalStorageService, keepOnLeave } from "@fz/ui/storage";
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
  private readonly storage = inject(LocalStorageService);
  private readonly game = inject(GameService);
  private readonly waves = inject(GAME_WAVES);

  constructor() {
    this.restore();
    effect(() => {
      this.game.runs();
      this.game.outcome();
      this.game.crew();
      untracked(() => {
        this.keep();
      });
    });
    keepOnLeave(() => {
      this.keep();
    });
  }

  /** Writes the run under way where it stands, or forgets one that isn't. */
  private keep(): void {
    const saved = this.game.saved();
    if (!saved) {
      this.storage.remove(SAVED_GAME_KEY);
      return;
    }
    this.storage.writeVersioned(SAVED_GAME_KEY, SAVED_GAME_VERSION, saved);
  }

  /** Takes up the run stored, if there is one that makes sense. */
  private restore(): void {
    const saved = this.storage.readVersioned(
      SAVED_GAME_KEY,
      SAVED_GAME_VERSION,
    );
    if (!saved) return;
    const takenUp = restoreGame(saved, this.waves, this.game.run().id + 1);
    if (takenUp) this.game.takeUp(takenUp);
  }
}
