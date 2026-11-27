import { Injectable, signal } from "@angular/core";
import { type Tuning, createTuning } from "@fz/game-ui/debug_menu";
import { FEEL, type FeelTuning } from "../../view/timeline/feel";

/**
 * Holds what the debug menu sets: the feel's numbers it tunes, and whether
 * the level in play is played off the record. It keeps neither, as they
 * change the player's own game only, until the page loads again.
 *
 * The game reads the numbers as `tuning.tuning()`, each from the next play
 * it builds, a tap's, a move's or a hint's, as a play on the board already
 * keeps the numbers it was built by; and `offRecord` for whether the level
 * in play keeps its records, telling it of each level begun with
 * `levelBegun()`.
 */
@Injectable({ providedIn: "root" })
export class DebugService {
  /** The feel's numbers the menu tunes: the design's own until it tunes them. */
  readonly tuning: Tuning<FeelTuning> = createTuning(FEEL);

  private readonly offRecordState = signal(false);

  /**
   * Whether the level in play keeps no records: it was begun on a deal the
   * menu chose, from a bug report or while still locked, or a number was
   * retuned at some moment since it began, even if the menu has put it
   * back since.
   */
  readonly offRecord = this.offRecordState.asReadonly();

  constructor() {
    this.tuning.onTune(() => {
      if (this.tuning.retuned()) this.offRecordState.set(true);
    });
  }

  /**
   * Begins watching a new level's records: it keeps none if it is played
   * off the record (`offRecord`), or if a number is retuned now or later
   * in it.
   */
  levelBegun(offRecord: boolean): void {
    this.offRecordState.set(offRecord || this.tuning.retuned());
  }
}
