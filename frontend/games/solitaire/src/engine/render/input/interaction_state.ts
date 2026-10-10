import { Point } from "../geometry";

/** Describes the stack being dragged and where the grabbed card is. */
export interface DragInteraction {
  /** The dragged card ids, primary (grabbed) card first, then those above it. */
  cardIds: string[];
  /** The current absolute position of the primary dragged card. */
  primary: Point;
}

/**
 * Names a stack easing across the board to the pile it was just moved to, so
 * it is drawn above the board until it lands.
 */
export interface FlightInteraction {
  /** The flying card ids, bottom card of the moved stack first. */
  cardIds: string[];
}

/**
 * Holds the pointer-driven state that, with the model, decides the
 * {@link TableViewState}.
 */
export interface TableInteractionState {
  /** The card under the mouse or last touched by a finger, or null. */
  hoveredCardId: string | null;
  /** The pile whose background placeholder is hovered, or null. */
  hoveredBackgroundPileId: string | null;
  /** The active drag, or null when nothing is being dragged. */
  drag: DragInteraction | null;
  /** The stacks still crossing the board, oldest first. */
  flights: readonly FlightInteraction[];
  /**
   * Whether every card snaps to its target this frame instead of easing, as
   * after a reset or resize.
   */
  snapAll: boolean;
}
