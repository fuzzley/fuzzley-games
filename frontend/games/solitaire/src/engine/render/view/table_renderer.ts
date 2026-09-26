import { TableViewState } from "./table_view_state";

/**
 * Draws a {@link TableViewState} onto whatever surface backs the table.
 *
 * Applying a state may only start cards easing towards it; ask
 * {@link areCardsTravelling} whether they have arrived.
 */
export interface TableRenderer {
  /**
   * Renders one frame.
   *
   * @param deltaMs Time since the last frame, or zero or less to apply the
   *   state immediately.
   */
  apply(viewState: TableViewState, deltaMs: number): void;

  /**
   * Returns whether any of the given cards had not yet reached its target when
   * the last frame was applied.
   */
  areCardsTravelling(cardIds: readonly string[]): boolean;
}
