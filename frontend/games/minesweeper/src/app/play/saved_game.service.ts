import { Injectable, inject, untracked } from "@angular/core";
import { type StoredFields, type Unversioned, keepSaved } from "@fz/ui/storage";
import { isDifficultyId } from "../../rules/difficulty";
import { isCount } from "@fz/core/json";
import { restoreField, saveField } from "../../rules/saved_field";
import { GameService } from "./game.service";

/** Where the game in progress is kept. Renaming it loses every player's. */
export const SAVED_GAME_KEY = "minesweeper-game";

/** The shape the game is kept in; a reader drops any other. */
const SAVED_GAME_VERSION = 1;

/**
 * Keeps the game in progress, its time and its difficulty, and takes it up
 * again when the page loads, so a reload or a phone dropping the tab loses
 * nothing.
 *
 * Only a game under way is kept: one not started yet, or over, is not. It is
 * written once a move, and once more as the page goes out of sight, rather
 * than every time the clock ticks. Something must inject it at startup for
 * the game to be restored.
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
    const field = this.game.field();
    if (field.outcome !== "playing") return null;
    return {
      difficulty: this.game.difficulty(),
      seconds: untracked(this.game.seconds),
      field: saveField(field),
    };
  }

  /** Takes up the game kept, if it makes sense. */
  private restore(saved: StoredFields): void {
    const { difficulty, seconds } = saved;
    const field = restoreField(saved["field"]);
    if (
      field?.outcome !== "playing" ||
      !isDifficultyId(difficulty) ||
      !isCount(seconds)
    ) {
      return;
    }
    this.game.resume(field, seconds, difficulty);
  }
}
