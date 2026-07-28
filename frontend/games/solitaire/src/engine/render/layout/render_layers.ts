/**
 * The board's z-order, back to front.
 *
 * Every depth the renderer sets comes from here, so what covers what is one
 * readable list rather than a set of constants that have to be compared to each
 * other to be understood. A layer's depths are a band of its own (see
 * {@link depthFor}), which is what lets a card be ordered within its pile
 * without any risk of it overtaking the layer above.
 */
export enum RenderLayer {
  /** A pile's empty placeholder, below everything that can sit in it. */
  PILE_BACKGROUND,

  /**
   * A card at rest in a pile.
   *
   * Ordered board-wide rather than per pile: two cards in different piles would
   * otherwise share a depth and be left to whatever order their sprites happened
   * to be created in.
   */
  RESTING_CARD,

  /**
   * The border around the card or empty slot under the pointer. Above resting
   * cards, so the card stacked on the hovered one cannot draw over it.
   */
  HOVER_HINT,

  /** The border marking the pile a held stack would land on if released now. */
  DROP_TARGET_HINT,

  /**
   * A card crossing the board to the pile it was just moved to.
   *
   * A card's resting depth only orders it within its own pile, so a card moved
   * to a foundation takes its new pile's low depth the instant the model moves
   * it and would spend the whole flight drawn underneath the columns it crosses.
   */
  FLYING_CARD,

  /**
   * A card in hand, following the pointer. The top of the board: whatever is
   * under the player's finger covers everything else, including a card flying
   * past it.
   */
  HELD_CARD,
}

/**
 * Depths reserved for each layer.
 *
 * Comfortably wider than the 104 cards the largest game deals, so nothing
 * ordered within a layer can run out of room.
 */
const LAYER_BAND = 1000;

/**
 * The render depth of one thing in a layer.
 *
 * @param layer The layer it belongs to.
 * @param indexInLayer Its order within that layer, higher drawing on top.
 *   Clamped into the layer's band, so a miscounted index can never leak into the
 *   layer above rather than merely being drawn in the wrong order.
 * @returns The depth to hand to the renderer.
 */
export function depthFor(layer: RenderLayer, indexInLayer = 0): number {
  const offset = Math.min(
    Math.max(Math.trunc(indexInLayer), 0),
    LAYER_BAND - 1,
  );
  return layer * LAYER_BAND + offset;
}
