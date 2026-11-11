import { Injectable, inject } from "@angular/core";
import { storedSignal } from "@fz/ui/storage";
import { clearedOf, isOpen as isLevelOpen } from "../../rules/run/progress";
import { GAME_LEVELS } from "../tokens";

/** Where the progress is kept. Renaming it loses every player's. */
const PROGRESS_KEY = "brick-fuzz-pop-progress";

/** The shape the progress is kept in; a reader drops any other. */
const PROGRESS_VERSION = 1;

/**
 * Keeps the levels the player has cleared, which open the levels after them.
 *
 * Hand it only levels cleared on the numbers the game ships: a run on
 * numbers the debug menu retuned keeps no records, here or in the stats.
 */
@Injectable({ providedIn: "root" })
export class ProgressService {
  private readonly levels = inject(GAME_LEVELS);
  private readonly state = storedSignal({
    key: PROGRESS_KEY,
    version: PROGRESS_VERSION,
    read: (saved) => clearedOf(saved?.["cleared"], this.levels),
    write: (cleared) => ({ cleared: [...cleared] }),
  });

  /** The ids of the levels cleared. */
  readonly cleared = this.state.asReadonly();

  /** Returns whether a run may start at a level, by its number. */
  isOpen(level: number): boolean {
    return isLevelOpen(this.levels, this.state(), level);
  }

  /** Keeps a level cleared, by its id, which opens the next. */
  recordCleared(id: string): void {
    if (this.state().has(id)) return;
    this.state.update((cleared) => new Set([...cleared, id]));
  }
}
