import { DOCUMENT } from "@angular/common";
import {
  DestroyRef,
  Injectable,
  effect,
  inject,
  untracked,
} from "@angular/core";
import { LocalStorageService } from "@fz/ui/storage";
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
 * or eats an apple, and as the page goes away, rather than at every step. A
 * hidden page pauses the run, which writes it where it stands. Something
 * must inject it at startup for the run to be taken up.
 */
@Injectable({ providedIn: "root" })
export class SavedGameService {
  private readonly storage = inject(LocalStorageService);
  private readonly game = inject(GameService);

  constructor() {
    this.restore();
    effect(() => {
      this.game.outcome();
      this.game.score();
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
    const saved = saveRun(this.game.run());
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
    const run = restoreRun(saved, this.game.run().id + 1);
    if (run) this.game.takeUp(run);
  }
}
