import { Injectable, inject, signal } from "@angular/core";
import { LocalStorageService } from "@fz/ui/storage";
import { clearedOf, isOpen as isLevelOpen } from "../../rules/progress";
import { GAME_LEVELS } from "../tokens";

/** Where the progress is kept. Renaming it loses every player's. */
export const PROGRESS_KEY = "brick-breaker-progress";

/** The shape the progress is kept in; a reader drops any other. */
const PROGRESS_VERSION = 1;

/** Keeps the levels the player has cleared, at any speed, which open the levels after them. */
@Injectable({ providedIn: "root" })
export class ProgressService {
  private readonly storage = inject(LocalStorageService);
  private readonly levels = inject(GAME_LEVELS);
  private readonly state = signal(this.read());

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
    this.storage.writeVersioned(PROGRESS_KEY, PROGRESS_VERSION, {
      cleared: [...this.state()],
    });
  }

  /** Returns the levels cleared as stored, dropping any the game no longer has. */
  private read(): ReadonlySet<string> {
    const saved = this.storage.readVersioned(PROGRESS_KEY, PROGRESS_VERSION);
    return clearedOf(saved?.["cleared"], this.levels);
  }
}
