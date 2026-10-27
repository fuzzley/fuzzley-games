import { DOCUMENT } from "@angular/common";
import {
  DestroyRef,
  Injectable,
  effect,
  inject,
  untracked,
} from "@angular/core";
import { LocalStorageService } from "@fz/ui/storage";
import { isWhole } from "../../rules/json";
import { restoreGrid, saveGrid } from "../../rules/saved_grid";
import { GameService } from "./game.service";

/** Where the game in progress is kept. Renaming it loses every player's. */
export const SAVED_GAME_KEY = "sudoku-game";

/**
 * The shape the game is kept in; a reader drops any other. `replay` came
 * later, and a reader takes an entry without it as no replay.
 */
const SAVED_GAME_VERSION = 1;

/**
 * Keeps the game in progress and its time, and takes it up again when the
 * page loads, so a reload or a phone dropping the tab loses nothing, undo's
 * moves included.
 *
 * Only a game under way is kept: a fresh deal no move has touched, or a
 * solved puzzle, is not. It is written once a move, and once more as the
 * page goes out of sight, rather than every time the clock ticks. Something
 * must inject it at startup for the game to be restored.
 */
@Injectable({ providedIn: "root" })
export class SavedGameService {
  private readonly storage = inject(LocalStorageService);
  private readonly game = inject(GameService);

  constructor() {
    this.restore();
    effect(() => {
      this.keep();
    });

    const document = inject(DOCUMENT);
    const view = document.defaultView;
    const keepTime = (): void => {
      if (document.visibilityState === "hidden") this.keep();
    };
    const keepAll = (): void => {
      this.keep();
    };
    document.addEventListener("visibilitychange", keepTime);
    view?.addEventListener("pagehide", keepAll);
    inject(DestroyRef).onDestroy(() => {
      document.removeEventListener("visibilitychange", keepTime);
      view?.removeEventListener("pagehide", keepAll);
    });
  }

  /** Writes the game under way, with its time, or forgets one that isn't. */
  private keep(): void {
    const grid = this.game.grid();
    if (!this.game.inProgress()) {
      this.storage.remove(SAVED_GAME_KEY);
      return;
    }
    this.storage.writeVersioned(SAVED_GAME_KEY, SAVED_GAME_VERSION, {
      seconds: untracked(this.game.seconds),
      grid: saveGrid(grid),
      replay: this.game.replay(),
    });
  }

  /** Takes up the game stored, if there is one that makes sense. */
  private restore(): void {
    const saved = this.storage.readVersioned(
      SAVED_GAME_KEY,
      SAVED_GAME_VERSION,
    );
    if (!saved) return;
    const { seconds } = saved;
    const grid = restoreGrid(saved["grid"]);
    if (grid?.outcome !== "playing" || !isWhole(seconds) || seconds < 0) {
      return;
    }
    this.game.resume(grid, seconds, saved["replay"] === true);
  }
}
