import { Injectable, effect, inject } from "@angular/core";
import type { PlayableGame } from "@/engine/tableau/session/playable_game";
import { GamePosition, readGamePosition } from "../model/game_position";
import { sameOptionValues } from "../provider/game_catalog";
import { GameCatalogService } from "./game_catalog.service";
import { LocalStorageService } from "./local_storage.service";

const STORAGE_KEY = "fsolitaire-saved-game";

/**
 * Keeps the game on the table in storage, so a reload carries on with it.
 *
 * One game is kept, whichever is on the table. It is restored at startup when
 * that is the same game played by the same rules, and forgotten once won.
 */
@Injectable({ providedIn: "root" })
export class SavedGameService {
  private readonly storage = inject(LocalStorageService);
  private readonly catalog = inject(GameCatalogService);

  constructor() {
    this.restore();

    effect((onCleanup) => {
      const { game } = this.catalog.session();
      let following = true;
      let won = false;
      let saveQueued = false;

      // Saved once the action has finished rather than on each metric it
      // publishes: an undo publishes before the game has finished undoing.
      const queueSave = () => {
        if (saveQueued) return;
        saveQueued = true;
        queueMicrotask(() => {
          saveQueued = false;
          if (following && !won) this.save(game);
        });
      };
      const onReset = () => {
        won = false;
        queueSave();
      };
      const onWon = () => {
        won = true;
        this.storage.remove(STORAGE_KEY);
      };

      const stopFollowing = [
        game.state.onChange(queueSave),
        game.on("game-reset", onReset),
        game.on("game-won", onWon),
      ];
      onCleanup(() => {
        following = false;
        for (const stop of stopFollowing) stop();
      });
    });
  }

  /** Restores the saved game if it is the game on the table, by its rules. */
  private restore(): void {
    const saved = this.read();
    if (
      !saved ||
      saved.gameId !== this.catalog.selectedId() ||
      !sameOptionValues(saved.options, this.catalog.optionValues())
    ) {
      return;
    }
    try {
      this.catalog.session().game.restore(saved.snapshot);
    } catch (e) {
      console.warn("The saved game does not fit this build:", e);
    }
  }

  private read(): GamePosition | null {
    const stored = this.storage.readObject<unknown>(STORAGE_KEY);
    if (!stored) return null;
    try {
      return readGamePosition(stored);
    } catch (e) {
      console.warn("The saved game is malformed:", e);
      return null;
    }
  }

  private save(game: PlayableGame): void {
    const position: GamePosition = {
      gameId: this.catalog.selectedId(),
      options: this.catalog.optionValues(),
      snapshot: game.snapshot(),
    };
    this.storage.writeObject(STORAGE_KEY, position);
  }
}
