import { TableViewState } from "./table_view_state";

/**
 * Draws a {@link TableViewState} onto whatever surface backs the table.
 *
 * The boundary between the engine and its rendering backend. A view state is a
 * complete, framework-free description of what the table should look like for
 * one frame, so everything above this port — layout, rules, interaction — is
 * written and tested without a canvas, and a backend is free to reach that
 * appearance however it likes.
 *
 * Phaser's implementation eases sprites towards their targets over several
 * frames rather than snapping to them, which is why {@link areCardsTravelling}
 * exists: a caller cannot assume that applying a state has finished the job.
 */
export interface TableRenderer {
  /**
   * Renders one frame.
   *
   * @param viewState The desired appearance of the table.
   * @param deltaMs Elapsed time since the last frame, which a backend that
   *   animates uses to stay frame-rate independent. Zero or less means apply
   *   the state immediately.
   */
  apply(viewState: TableViewState, deltaMs: number): void;

  /**
   * Whether any of the given cards had still not reached its target when the
   * last frame was applied.
   *
   * Only the renderer knows, because only the renderer animates. Callers ask so
   * they can retire state that is only meaningful while cards are in motion —
   * a moved stack is lifted above the board until it has landed.
   *
   * @param cardIds The card ids to test.
   */
  areCardsTravelling(cardIds: readonly string[]): boolean;
}
