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

/** The parts a pile can play in a Seahaven Towers game. */
export const SeahavenRole = {
  /** A single-card holding cell. There are four, in the towers along the top. */
  CELL: "cell",
  /** A suit pile built up from Ace to King. */
  FOUNDATION: "foundation",
  /** A board column built down in a single suit. */
  TABLEAU: "tableau",
} as const satisfies Record<string, PileRole>;

/** One of the parts a Seahaven Towers pile can play. */
export type SeahavenRole = (typeof SeahavenRole)[keyof typeof SeahavenRole];

/**
 * How many cards may be moved at once in the given position: `free cells + 1`,
 * with no doubling for empty columns.
 *
 * Exact rather than a conservative approximation, and the reason is the
 * Kings-only empty column. FreeCell's `(free cells + 1) x 2 ^ (empty columns)`
 * assumes an empty column can stage an arbitrary sub-run on the way past. Here a
 * column takes only a King.
 *
 * A moving run is descending in one suit, so its only King is its bottom card.
 * Every sub-run a supermove stages is a proper suffix of that run, so its bottom
 * card is never a King, so it can never be parked in a Kings-only empty column.
 * Empty columns therefore contribute nothing, and the decomposition reduces to:
 * park the top `F` cards in cells, move the bottom card, replace the `F` cards.
 *
 * That also means there is no empty-destination special case to write. FreeCell
 * needs one because its destination would otherwise be counted as staging space
 * for the very run it is receiving; here an empty column was never worth
 * anything, so subtracting it would change nothing.
 *
 * With only four cells this bites hard: five is the most that can ever move, and
 * four or fewer for almost the whole game. Seahaven is the tightest of the
 * cell games for exactly this reason.
 */
export function supermoveLimit(context: PlacementContext): number {
  return context.board.emptyCount(SeahavenRole.CELL) + 1;
}

/**
 * A Seahaven column: only a King may start an empty one, anything after builds
 * down in the same suit, and no more may move at once than the cells can
 * actually shuffle around.
 */
export const SEAHAVEN_TABLEAU_RULE: PlacementRule = all(
  byEmptiness(cardIs(hasRank(Rank.KING)), descendingSameSuit),
  maxStackSize(supermoveLimit),
);

/** A cell: one card, any card. */
export const SEAHAVEN_CELL_RULE: PlacementRule = all(singleCardOnly, anyCard);

/** A Seahaven foundation: the standard Ace-up-by-suit pile. */
export const SEAHAVEN_FOUNDATION_RULE: PlacementRule = suitFoundation;

/**
 * The rule governing what a pile of the given role accepts, or null for a role
 * that is never a destination. Every Seahaven pile is one: there is no stock
 * and no waste.
 *
 * @param role The part the pile plays.
 */
export function seahavenPlacementRule(role: string): PlacementRule | null {
  switch (role) {
    case SeahavenRole.TABLEAU:
      return SEAHAVEN_TABLEAU_RULE;
    case SeahavenRole.CELL:
      return SEAHAVEN_CELL_RULE;
    case SeahavenRole.FOUNDATION:
      return SEAHAVEN_FOUNDATION_RULE;
    default:
      return null;
  }
}
