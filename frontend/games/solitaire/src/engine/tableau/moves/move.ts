import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";

/**
 * Names the kind of action an {@link AppliedMove} records, such as a draw; each
 * game chooses its own.
 */
export type AppliedMoveKind = string;

/** The kind of action a card dragged or sent to a pile records. */
export const MOVE_KIND: AppliedMoveKind = "move";

/** Describes a move that has passed the rules: its cards and where they go. */
export interface ResolvedMove {
  /** The card being moved plus everything stacked on it, bottom-first. */
  readonly movingStack: readonly PlayingCard[];
  /** The pile the stack is leaving. */
  readonly sourcePile: ReadonlyCardPile<PlayingCard>;
  /** The pile the stack is joining. */
  readonly targetPile: ReadonlyCardPile<PlayingCard>;
}

/** Records a run of cards moving from one pile to another. */
export interface CardTransfer {
  /**
   * The cards that changed pile, bottom first as they sat in
   * {@link fromPileId}.
   *
   * Source order, which a draw reverses, so undo can re-append them in this
   * order to rebuild the original pile.
   */
  readonly cardIds: readonly string[];

  /** The pile the cards came from, and that undo returns them to. */
  readonly fromPileId: string;

  /** The pile the cards went to. */
  readonly toPileId: string;

  /**
   * Whether the moved cards were face up in {@link fromPileId}, which is how
   * undo leaves them.
   */
  readonly faceUpBefore: boolean;
}

/**
 * Records what a move did beyond relocating its cards, so undo can take that
 * back too.
 */
export interface MoveEffects {
  /** The score change the move actually applied. */
  readonly scoreDelta: number;
  /** Cards the move turned face up by exposing them. */
  readonly flippedCardIds: readonly string[];
  /**
   * Further runs the move relocated as a consequence, such as a completed
   * Spider run, so one undo takes them back with it.
   */
  readonly followUpTransfers?: readonly CardTransfer[];
}

/** A move that changed nothing but the position of its cards. */
export const NO_MOVE_EFFECTS: MoveEffects = {
  scoreDelta: 0,
  flippedCardIds: [],
};

/**
 * Records an action applied to the board, with everything needed to take it
 * back.
 */
export interface AppliedMove {
  /** What the player did, which only matters for side effects like recycles. */
  readonly kind: AppliedMoveKind;

  /** The runs of cards this action relocated, in the order it relocated them. */
  readonly transfers: readonly CardTransfer[];

  /**
   * The score change this action actually applied, after any floor the game
   * keeps, so undo can subtract it exactly.
   */
  readonly scoreDelta: number;

  /**
   * The cards this action turned face up by exposing them, which undo turns
   * back down.
   */
  readonly flippedCardIds: readonly string[];
}

/**
 * Returns every card an action relocated, bottom first within each run as the
 * cards now lie rather than as {@link CardTransfer.cardIds} records them.
 *
 * @param positionOf Where a card now lies, as a rank that orders the whole
 *   board.
 */
export function relocatedCardIds(
  move: AppliedMove,
  positionOf: (cardId: string) => number,
): readonly string[] {
  // Sorted within each transfer rather than across all of them, so the runs stay
  // in the order the action relocated them — a run that left for a foundation
  // still lands after the move that completed it.
  return move.transfers.flatMap((transfer) =>
    [...transfer.cardIds].sort((a, b) => positionOf(a) - positionOf(b)),
  );
}
