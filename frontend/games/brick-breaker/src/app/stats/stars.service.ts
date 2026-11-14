import { Injectable, inject } from "@angular/core";
import { storedSignal } from "@fz/ui/storage";
import {
  type StarId,
  starsHeld,
  starsIn,
  starsRecordOf,
  withStars,
} from "../../rules/run/stars";
import { GAME_LEVELS } from "../tokens";
import { ProgressService } from "./progress.service";

/** Where the stars are kept. Renaming it loses every player's. */
export const STARS_KEY = "brick-breaker-stars";

/** The shape the stars are kept in; a reader drops any other. */
const STARS_VERSION = 1;

/**
 * Keeps the stars each level has won, each kept for good once won, at any
 * speed; a level cleared before stars were kept holds its first, from the
 * progress.
 */
@Injectable({ providedIn: "root" })
export class StarsService {
  private readonly levels = inject(GAME_LEVELS);
  private readonly progress = inject(ProgressService);
  private readonly state = storedSignal({
    key: STARS_KEY,
    version: STARS_VERSION,
    read: (saved) => starsRecordOf(saved, this.levels, this.progress.cleared()),
  });

  /** Returns the stars a level holds, by its id, in the order they are shown. */
  heldBy(id: string): StarId[] {
    return starsIn(starsHeld(this.state(), id));
  }

  /**
   * Keeps the stars a cleared level's play won, as `starsWon()` gives them,
   * and returns those the level didn't hold before, in the order they are
   * shown.
   */
  recordWon(id: string, won: number): StarId[] {
    const held = this.heldBy(id);
    this.state.set(withStars(this.state(), id, won));
    return starsIn(won).filter((star) => !held.includes(star));
  }
}
