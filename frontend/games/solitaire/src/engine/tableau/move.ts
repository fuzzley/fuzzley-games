/**
 * What kind of action an {@link AppliedMove} records.
 *
 * An opaque tag rather than a fixed set: the engine only ever compares it, and
 * a game names the actions it actually has. Klondike draws and recycles, Spider
 * deals a row, FreeCell does neither.
 */
export type AppliedMoveKind = string;

/** A run of cards moving from one pile to another. */
export interface CardTransfer {
  /**
   * The cards that changed pile, in the order they sat in {@link fromPileId}
   * bottom-first.
   *
   * Source order rather than the order they were moved, because those differ: a
   * Klondike draw pops the stock from the top and pushes onto the waste,
   * reversing the run. Recording where the cards came *from* means undo can
   * always re-append in this order and get the original pile back.
   */
  readonly cardIds: readonly string[];

  /** The pile the cards came from, and that undo returns them to. */
  readonly fromPileId: string;

  /** The pile the cards went to. */
  readonly toPileId: string;

  /**
   * Whether the moved cards were face up in {@link fromPileId}, and so how undo
   * should leave them. A draw turns cards up on their way to the waste and a
   * recycle turns them back down, so this is not always their current state.
   */
  readonly faceUpBefore: boolean;
}

/**
 * An action that has been applied to the board, with everything needed to take
 * it back.
 *
 * A *list* of transfers rather than a single from-and-to, because not every
 * action is one run moving to one place. A Spider deal moves ten cards to ten
 * different columns, and a Spider move that completes a King-to-Ace run also
 * sends that run off to a foundation — one thing the player did, two or ten
 * runs of cards relocated. Undo reverses the transfers in reverse order, so a
 * consequence is always taken back before its cause.
 */
export interface AppliedMove {
  /** What the player did, which only matters for side effects like recycles. */
  readonly kind: AppliedMoveKind;

  /** The runs of cards this action relocated, in the order it relocated them. */
  readonly transfers: readonly CardTransfer[];

  /**
   * The score change this action actually applied.
   *
   * The real delta, not what the scoring policy proposed: the score is clamped
   * at zero, so a 15 point penalty against a score of 10 moves it by 10. Undo
   * subtracts this and lands exactly back where it started.
   */
  readonly scoreDelta: number;

  /**
   * The cards this action turned face up by exposing them. Undo turns them
   * back down.
   *
   * A list rather than a single card, and empty rather than absent, because a
   * game that never flips anything must be as expressible as one that flips
   * several at once: FreeCell deals every card face up and has nothing to turn
   * over, while a Spider deal turns one card in each of ten columns.
   */
  readonly flippedCardIds: readonly string[];
}

/**
 * Every card an action relocated, bottom-first within each run it moved.
 *
 * The view lifts these clear of the board while their sprites catch up with the
 * model, which has already put them in their new piles.
 *
 * @param move The applied action to read.
 */
export function relocatedCardIds(move: AppliedMove): readonly string[] {
  return move.transfers.flatMap((transfer) => transfer.cardIds);
}
