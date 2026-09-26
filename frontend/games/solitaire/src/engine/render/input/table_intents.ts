/**
 * Describes something the player did in terms of the table rather than the
 * pointer, leaving the game to decide what it means.
 */
export type TableIntent =
  /** A card was pressed. */
  | { readonly kind: "activate"; readonly cardId: string }
  /**
   * A card was pressed twice in quick succession.
   *
   * Reported after the second press's own `activate`, not instead of it.
   */
  | { readonly kind: "activate-secondary"; readonly cardId: string }
  /** An empty pile's slot was pressed. */
  | { readonly kind: "activate-pile"; readonly pileId: string }
  /** A dragged stack was released, over `targetPileId` or over nothing. */
  | {
      readonly kind: "drop";
      readonly cardIds: readonly string[];
      readonly targetPileId: string | null;
    };

/**
 * Carries out an intent.
 *
 * Returns nothing because the model itself announces which cards moved.
 */
export type IntentHandler = (intent: TableIntent) => void;
