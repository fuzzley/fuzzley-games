import { Injectable, inject, untracked } from "@angular/core";
import { type StoredFields, type Unversioned, keepSaved } from "@fz/ui/storage";
import { isCount } from "@fz/core/json";
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
  private readonly game = inject(GameService);

  constructor() {
    keepSaved({
      key: SAVED_GAME_KEY,
      version: SAVED_GAME_VERSION,
      save: () => this.save(),
      restore: (saved) => {
        this.restore(saved);
      },
    });
  }

  /**
   * Returns the game under way, with its time, or none for one that isn't,
   * whose entry is then forgotten.
   *
   * A write follows everything it reads but the clock, read untracked, so
   * the game is written once a move rather than at every tick.
   */
  private save(): Unversioned | null {
    const grid = this.game.grid();
    if (!this.game.inProgress()) return null;
    return {
      seconds: untracked(this.game.seconds),
      grid: saveGrid(grid),
      replay: this.game.replay(),
    };
  }

  /** Takes up the game kept, if it makes sense. */
  private restore(saved: StoredFields): void {
    const { seconds } = saved;
    const grid = restoreGrid(saved["grid"]);
    if (grid?.outcome !== "playing" || !isCount(seconds)) {
      return;
    }
    this.game.resume(grid, seconds, saved["replay"] === true);
  }
}
