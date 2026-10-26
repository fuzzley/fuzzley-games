import { Injectable, effect, inject } from "@angular/core";
import { LocalStorageService } from "@fz/ui/storage";
import { isDifficultyId } from "../../rules/difficulty";
import { isWhole } from "../../rules/json";
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
 * Only a game under way is kept: one not started yet, or over, is not.
 * Something must inject it at startup for the game to be restored.
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
  }

  private keep(): void {
    const field = this.game.field();
    if (field.outcome !== "playing") {
      this.storage.remove(SAVED_GAME_KEY);
      return;
    }
    this.storage.writeVersioned(SAVED_GAME_KEY, SAVED_GAME_VERSION, {
      difficulty: this.game.difficulty(),
      seconds: this.game.seconds(),
      field: saveField(field),
    });
  }

  /** Takes up the game stored, if there is one that makes sense. */
  private restore(): void {
    const saved = this.storage.readVersioned(
      SAVED_GAME_KEY,
      SAVED_GAME_VERSION,
    );
    if (!saved) return;
    const { difficulty, seconds } = saved;
    const field = restoreField(saved["field"]);
    if (
      field?.outcome !== "playing" ||
      !isDifficultyId(difficulty) ||
      !isWhole(seconds) ||
      seconds < 0
    ) {
      return;
    }
    this.game.resume(field, seconds, difficulty);
  }
}
