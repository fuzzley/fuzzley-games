import { PileRole } from "@/engine/core/card/card_pile";
import { Rank } from "@/engine/core/card/playing_card";
import {
  PlacementContext,
  PlacementRule,
  all,
  anyCard,
  byEmptiness,
  cardIs,
  descendingSameSuit,
  hasRank,
  maxStackSize,
  singleCardOnly,
  suitFoundation,
} from "@/engine/tableau/rules";

/** The parts a pile can play in an Eight Off game. */
export const EightOffRole = {
  /** A single-card holding cell. There are eight, which is the whole name. */
  CELL: "cell",
  /** A suit pile built up from Ace to King. */
  FOUNDATION: "foundation",
  /** A board column built down in a single suit. */
  TABLEAU: "tableau",
} as const satisfies Record<string, PileRole>;

/** One of the parts an Eight Off pile can play. */
export type EightOffRole = (typeof EightOffRole)[keyof typeof EightOffRole];

/**
 * How many cards may be moved at once in the given position: `free cells + 1`,
 * with no doubling for empty columns.
 *
 * This is exact rather than a conservative approximation, and the difference
 * from FreeCell is a consequence of one rule. FreeCell's
 * `(free cells + 1) x 2 ^ (empty columns)` assumes an empty column can stage an
 * arbitrary sub-run on the way past. An Eight Off column takes only a King.
 *
 * A moving run is descending in one suit, so its only King is its bottom card.
 * Every sub-run a supermove stages is a proper suffix of that run, so its bottom
 * card is never a King, so it can never be parked in a Kings-only empty column.
 * Empty columns therefore contribute zero staging capacity, and the
 * decomposition reduces to: park the top `F` cards in cells, move the bottom
 * card, replace the `F` cards — `F + 1` exactly.
 *
 * That also means there is no empty-destination special case to write. FreeCell
 * needs one because its destination would otherwise be counted as staging space
 * for the very run it is receiving; here an empty column was never worth
 * anything to begin with, so subtracting it would change nothing.
 *
 * Keeping the doubling would let a player start a move the board cannot finish
 * — the same defect FreeCell's `supermoveLimit` doc warns about for its
 * destination column, arrived at from the other direction.
 */
export function supermoveLimit(context: PlacementContext): number {
  return context.board.emptyCount(EightOffRole.CELL) + 1;
}

/**
 * An Eight Off column: only a King may start an empty one, anything after
 * builds down in the same suit, and no more may move at once than the cells can
 * actually shuffle around.
 *
 * The Kings-only empty column is what makes the game hard — an emptied column
 * is worth nothing until a King is free to take it — and, as
 * {@link supermoveLimit} explains, it is also what flattens the supermove
 * arithmetic.
 */
export const EIGHT_OFF_TABLEAU_RULE: PlacementRule = all(
  byEmptiness(cardIs(hasRank(Rank.KING)), descendingSameSuit),
  maxStackSize(supermoveLimit),
);

/** A free cell: one card, any card. */
export const EIGHT_OFF_CELL_RULE: PlacementRule = all(singleCardOnly, anyCard);

/** An Eight Off foundation: the standard Ace-up-by-suit pile. */
export const EIGHT_OFF_FOUNDATION_RULE: PlacementRule = suitFoundation;

/**
 * The rule governing what a pile of the given role accepts, or null for a role
 * that is never a destination. Like FreeCell, every Eight Off pile is one:
 * there is no stock and no waste.
 */
export function eightOffPlacementRule(role: string): PlacementRule | null {
  switch (role) {
    case EightOffRole.TABLEAU:
      return EIGHT_OFF_TABLEAU_RULE;
    case EightOffRole.CELL:
      return EIGHT_OFF_CELL_RULE;
    case EightOffRole.FOUNDATION:
      return EIGHT_OFF_FOUNDATION_RULE;
    default:
      return null;
  }
}
