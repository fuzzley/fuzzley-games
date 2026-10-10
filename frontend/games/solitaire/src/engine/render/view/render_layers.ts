/**
 * Lists the board's layers from back to front, each a band of depths that
 * {@link depthFor} hands out.
 */
export enum RenderLayer {
  /** A pile's empty placeholder, below everything that can sit in it. */
  PILE_BACKGROUND,

  /** A card at rest in a pile, ordered board-wide so no two share a depth. */
  RESTING_CARD,

  /** The border around the card or empty slot under the pointer. */
  HOVER_HINT,

  /** The border marking the pile a held stack would land on if released now. */
  DROP_TARGET_HINT,

  /**
   * A card crossing the board to the pile it was just moved to, drawn over the
   * piles it passes.
   */
  FLYING_CARD,

  /** A card in hand, following the pointer and covering everything else. */
  HELD_CARD,
}

/**
 * Depths reserved for each layer, comfortably more than the 104 cards the
 * largest game deals.
 */
const LAYER_BAND = 1000;

/**
 * Returns the render depth of one thing in a layer.
 *
 * @param indexInLayer Its order within the layer, higher drawing on top,
 *   clamped so it can never reach the layer above.
 */
export function depthFor(layer: RenderLayer, indexInLayer = 0): number {
  const offset = Math.min(
    Math.max(Math.trunc(indexInLayer), 0),
    LAYER_BAND - 1,
  );
  return layer * LAYER_BAND + offset;
}
