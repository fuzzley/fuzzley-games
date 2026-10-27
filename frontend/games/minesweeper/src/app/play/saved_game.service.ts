import { DOCUMENT } from "@angular/common";
import {
  DestroyRef,
  Injectable,
  effect,
  inject,
  untracked,
} from "@angular/core";
import { LocalStorageService } from "@fz/ui/storage";
import { isDifficultyId } from "../../rules/difficulty";
import { isWhole } from "@fz/core/json";
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
    const field = this.game.field();
    if (field.outcome !== "playing") {
      this.storage.remove(SAVED_GAME_KEY);
      return;
    }
    this.storage.writeVersioned(SAVED_GAME_KEY, SAVED_GAME_VERSION, {
      difficulty: this.game.difficulty(),
      seconds: untracked(this.game.seconds),
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
