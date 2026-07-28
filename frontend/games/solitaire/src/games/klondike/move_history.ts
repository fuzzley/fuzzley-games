/** The kind of action an {@link AppliedMove} records. */
export type AppliedMoveKind = "move" | "draw" | "recycle";

/**
 * An action that has been applied to the board, with everything needed to take
 * it back.
 *
 * Every action the player can take moves a run of cards from one pile to
 * another, so one shape covers all three kinds and undo is a single routine
 * rather than a branch per action.
 */
export interface AppliedMove {
  /** What the player did, which only matters for side effects like recycles. */
  kind: AppliedMoveKind;

  /**
   * The cards that changed pile, in the order they sat in {@link fromPileId}
   * bottom-first.
   *
   * Source order rather than the order they were moved, because those differ: a
   * draw pops the stock from the top and pushes onto the waste, reversing the
   * run. Recording where the cards came *from* means undo can always re-append
   * in this order and get the original pile back.
   */
  cardIds: readonly string[];

  /** The pile the cards came from, and that undo returns them to. */
  fromPileId: string;

  /** The pile the cards went to. */
  toPileId: string;

  /**
   * The score change this action actually applied.
   *
   * The real delta, not what the scoring policy proposed: the score is clamped
   * at zero, so a 15 point penalty against a score of 10 moves it by 10. Undo
   * subtracts this and lands exactly back where it started.
   */
  scoreDelta: number;

  /**
   * Whether the moved cards were face up in {@link fromPileId}, and so how undo
   * should leave them. A draw turns cards up on their way to the waste and a
   * recycle turns them back down, so this is not always their current state.
   */
  faceUpBefore: boolean;

  /**
   * The tableau card this action turned face up by exposing it, if any. Undo
   * turns it back down.
   */
  flippedCardId?: string;
}
