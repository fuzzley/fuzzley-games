import { Injectable, computed, signal } from "@angular/core";
import { type Tuning, createTuning } from "@fz/game-ui/debug_menu";
import { LEAST_DEPTH, MOST_DEPTH } from "../../rules/tuning";
import {
  TUNED_NUMBERS,
  type TunedNumbers,
  staleCertificates,
} from "../../view/debug/debug_tuning";

/** Says how a run begins, for its records. */
export interface RunStart {
  /** Whether storage kept the run as played off the record. */
  readonly kept?: boolean;
  /** Whether it starts at a level the player hasn't opened. */
  readonly locked?: boolean;
}

/**
 * Holds what the debug menu sets: the numbers it tunes, the field's depth
 * over the room's and whether every level is open. It keeps none of them,
 * as they change the player's own game only, until the page loads again.
 *
 * The game reads it: the numbers through `paceOf()` and `rulesOf()`, each
 * change heard through `tuning.onTune()`, the depth between rounds, every
 * level open in the Levels dialog, and `runOffRecord` for whether the run
 * under way keeps its records, telling it each run begun with
 * `startRun()`.
 */
@Injectable({ providedIn: "root" })
export class DebugService {
  /** The numbers the menu tunes: the game's own until it tunes them. */
  readonly tuning: Tuning<TunedNumbers> = createTuning(TUNED_NUMBERS);

  private readonly depthSet = signal<number | null>(null);

  private readonly levelsOpen = signal(false);

  private readonly runLatch = signal(false);

  /** The field's depth the menu sets over the room's, or null for the room's own. */
  readonly depth = this.depthSet.asReadonly();

  /** Whether the menu opens every level, locked or not. */
  readonly everyLevelOpen = this.levelsOpen.asReadonly();

  /** Whether a number the rules read has moved, which leaves the certificates stale. */
  readonly certificatesStale = computed(() =>
    staleCertificates(this.tuning.tuning()),
  );

  /**
   * Whether the run under way keeps no records: it was started at a level
   * the player hadn't opened, or a number was retuned at some moment since
   * it began, even if the menu has put it back since. A depth set costs it
   * nothing, as a window of that size would give it.
   */
  readonly runOffRecord = this.runLatch.asReadonly();

  constructor() {
    this.tuning.onTune(() => {
      if (this.tuning.retuned()) this.runLatch.set(true);
    });
  }

  /**
   * Begins watching a new run's records: it keeps none if a number is
   * retuned now or later in it, if it starts at a level the player hasn't
   * opened (`locked`), as every level open allows, or if storage kept it as
   * played off the record (`kept`), as a run taken up may be.
   */
  startRun({ kept = false, locked = false }: RunStart = {}): void {
    this.runLatch.set(kept || locked || this.tuning.retuned());
  }

  /**
   * Sets the field's depth over the room's, or gives it back to the room's
   * with null; throws a RangeError for a depth no field has.
   */
  setDepth(depth: number | null): void {
    if (
      depth !== null &&
      !(Number.isInteger(depth) && depth >= LEAST_DEPTH && depth <= MOST_DEPTH)
    ) {
      throw new RangeError(
        `No field is ${String(depth)} deep: the depths run from ${String(LEAST_DEPTH)} to ${String(MOST_DEPTH)}.`,
      );
    }
    this.depthSet.set(depth);
  }

  /**
   * Opens every level, or only those the player has, as its checkbox says.
   * It costs no run its records until one starts at a level the player
   * hadn't opened.
   */
  openEveryLevel(open: boolean): void {
    this.levelsOpen.set(open);
  }
}
