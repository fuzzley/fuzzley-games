import { DOCUMENT } from "@angular/common";
import {
  DestroyRef,
  Injectable,
  effect,
  inject,
  untracked,
} from "@angular/core";
import { LocalStorageService } from "@fz/ui/storage";
import { restoreGame } from "../../rules/saved_game";
import { GameService } from "./game.service";
import { GAME_LEVELS } from "../tokens";

/** Where the run under way is kept. Renaming it loses every player's. */
export const SAVED_GAME_KEY = "brick-breaker-game";

/** The shape the run is kept in; a reader drops any other. */
const SAVED_GAME_VERSION = 1;

/**
 * Keeps the run under way, and takes it up again, paused, when the page
 * loads, so a reload or a phone dropping the tab loses little.
 *
 * It writes as the run changes course, never at a step, and something must
 * inject it at startup for the run to be taken up.
 */
@Injectable({ providedIn: "root" })
export class SavedGameService {
  private readonly storage = inject(LocalStorageService);
  private readonly game = inject(GameService);
  private readonly levels = inject(GAME_LEVELS);

  constructor() {
    this.restore();
    effect(() => {
      this.game.outcome();
      this.game.serving();
      this.game.runs();
      untracked(() => {
        this.keep();
      });
    });

    const view = inject(DOCUMENT).defaultView;
    const keepAll = (): void => {
      this.keep();
    };
    view?.addEventListener("pagehide", keepAll);
    inject(DestroyRef).onDestroy(() => {
      view?.removeEventListener("pagehide", keepAll);
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
    const takenUp = restoreGame(saved, this.levels, this.game.run().id + 1);
    if (takenUp) this.game.takeUp(takenUp);
  }
}
