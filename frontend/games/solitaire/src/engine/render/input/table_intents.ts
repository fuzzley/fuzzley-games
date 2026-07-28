/**
 * Something the player did, described in terms of the table rather than the
 * pointer.
 *
 * The seam between "a mouse button went down over this sprite" and "draw a
 * card". The drag machinery is the same in every card game; what a press
 * *means* is not, so the machinery reports intents and the game decides.
 */
export type TableIntent =
  /** A card was pressed. */
  | { readonly kind: "activate"; readonly cardId: string }
  /**
   * A card was pressed twice in quick succession.
   *
   * Emitted in addition to the second {@link TableIntent} of kind `activate`,
   * not instead of it, so a game whose single press already does something —
   * Klondike's stock draw — keeps doing it.
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
 * Carries out an intent and reports which cards it moved.
 *
 * The returned ids are the stack to track across the board while its sprites
 * catch up with the model, which has already moved them. Empty means nothing
 * moved — either the game ignores this intent, or the rules refused it.
 */
export type IntentHandler = (intent: TableIntent) => readonly string[];
