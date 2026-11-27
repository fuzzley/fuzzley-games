import type { Signal, WritableSignal } from "@angular/core";
import {
  type IdentifiedLevel,
  clearedOf,
  isOpen as isLevelOpen,
} from "@fz/core/levels";
import { storedSignal } from "@fz/ui/storage";

/** Says where a game keeps an entry: its key, which renaming loses every player's, and the shape it is kept in, a reader dropping any other. */
export interface StoredAt {
  readonly key: string;
  readonly version: number;
}

/**
 * Keeps the levels a game's player has cleared, which open the levels
 * after them.
 *
 * A game's service extends it, handing it where they are kept and its
 * levels, as it is made in an injection context. Hand it only levels
 * cleared on the record.
 */
export abstract class StoredProgress {
  private readonly state: WritableSignal<ReadonlySet<string>>;

  /** The ids of the levels cleared. */
  readonly cleared: Signal<ReadonlySet<string>>;

  protected constructor(
    at: StoredAt,
    private readonly levels: readonly IdentifiedLevel[],
  ) {
    this.state = storedSignal({
      ...at,
      read: (saved) => clearedOf(saved?.["cleared"], levels),
      write: (cleared) => ({ cleared: [...cleared] }),
    });
    this.cleared = this.state.asReadonly();
  }

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
