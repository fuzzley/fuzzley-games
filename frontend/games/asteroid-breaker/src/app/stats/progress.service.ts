import { Injectable, inject, signal } from "@angular/core";
import { LocalStorageService } from "@fz/ui/storage";
import { isOpen as isSectorOpen, reachedOf } from "../../rules/run/progress";
import type { RunRecords } from "../../rules/run/stats";
import { GAME_WAVES } from "../tokens";

/** Where the progress is kept. Renaming it loses every player's. */
export const PROGRESS_KEY = "asteroid-breaker-progress";

/** The shape the progress is kept in; a reader drops any other. */
const PROGRESS_VERSION = 1;

/** Keeps the sectors the player has reached, at any speed, which a run may start at. */
@Injectable({ providedIn: "root" })
export class ProgressService {
  private readonly storage = inject(LocalStorageService);
  private readonly waves = inject(GAME_WAVES);
  private readonly state = signal(this.read());

  /** The ids of the sectors reached. */
  readonly reached = this.state.asReadonly();

  /** Returns whether a run may start at a sector, by its id. */
  isOpen(sector: string): boolean {
    return isSectorOpen(this.waves, this.state(), sector);
  }

  /**
   * Keeps the sectors a change in a run reached, by their ids, which a run
   * may start at from then on, and stores them, unless each was reached
   * before.
   */
  record({ reached }: Pick<RunRecords, "reached">): void {
    const known = this.state();
    const added = reached.filter((sector) => !known.has(sector));
    if (added.length === 0) return;
    this.state.set(new Set([...known, ...added]));
    this.storage.writeVersioned(PROGRESS_KEY, PROGRESS_VERSION, {
      reached: [...this.state()],
    });
  }

  /** Returns the sectors reached as stored, dropping any the game no longer has. */
  private read(): ReadonlySet<string> {
    const saved = this.storage.readVersioned(PROGRESS_KEY, PROGRESS_VERSION);
    return reachedOf(saved?.["reached"], this.waves);
  }
}
