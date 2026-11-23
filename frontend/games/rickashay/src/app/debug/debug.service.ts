import { Injectable, signal } from "@angular/core";
import type { RecordsMenu, RunOpened } from "@fz/brick-wall/app/records";
import type { ReportsMenu } from "@fz/brick-wall/app/reported";
import { LEAST_DEPTH, MOST_DEPTH, isDepth } from "@fz/brick-wall/rules/field";

/**
 * Holds what the debug menu sets: the field's depth over the room's, and
 * whether the run under way keeps its records. It keeps neither, as they
 * change the player's own game only, until the page loads again.
 *
 * The game reads the depth between rounds, and `runOffRecord` for whether
 * the run under way keeps its records, telling it each run begun with
 * `startRun()`; a bug report's state sets the depth its round started on.
 */
@Injectable({ providedIn: "root" })
export class DebugService implements RecordsMenu, ReportsMenu {
  private readonly depthSet = signal<number | null>(null);

  private readonly runLatch = signal(false);

  /** The field's depth the menu sets over the room's, or null for the room's own. */
  readonly depth = this.depthSet.asReadonly();

  /**
   * Whether the run under way keeps no records: it was started at a level
   * the player hadn't opened, or taken up as played off the record. A depth
   * set costs it nothing, as a window of that size would give it.
   */
  readonly runOffRecord = this.runLatch.asReadonly();

  /**
   * Begins watching a new run's records: it keeps none if it starts at a
   * level the player hasn't opened (`locked`), if it plays a certificate's
   * line (`certified`), or if storage or a bug report kept it as played off
   * the record (`kept`).
   */
  startRun({
    kept = false,
    locked = false,
    certified = false,
  }: RunOpened = {}): void {
    this.runLatch.set(kept || locked || certified);
  }

  /**
   * Sets the field's depth over the room's, or gives it back to the room's
   * with null; throws a RangeError for a depth no field has.
   */
  setDepth(depth: number | null): void {
    if (depth !== null && !isDepth(depth)) {
      throw new RangeError(
        `No field is ${String(depth)} deep: the depths run from ${String(LEAST_DEPTH)} to ${String(MOST_DEPTH)}.`,
      );
    }
    this.depthSet.set(depth);
  }
}
