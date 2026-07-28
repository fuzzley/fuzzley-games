import { PlayingCard, rankBelow } from "@/engine/core/card/playing_card";
import {
  PlacementContext,
  PlacementRule,
  all,
  anyCard,
  byEmptiness,
  descendingAlternatingColor,
  isRed,
  maxStackSize,
  singleCardOnly,
  suitFoundation,
} from "@/engine/tableau/rules";
import { FreeCellRole } from "./freecell_zones";

/**
 * How many cards may be moved at once in the given position.
 *
 * A FreeCell move is really a sequence of single-card moves: each card above
 * the one being moved has to be parked somewhere and picked back up. So the
 * limit is `(free cells + 1) x 2 ^ (empty columns)` — every free cell holds one
 * card, and every empty column can hold a whole sub-run.
 *
 * An empty *destination* column does not count towards its own capacity: the
 * run is going there, so it cannot also be used to stage part of the run on the
 * way. Leaving that out is the classic off-by-a-factor-of-two in FreeCell
 * implementations, and it lets a player make a move the game cannot actually
 * carry out.
 */
export function supermoveLimit(context: PlacementContext): number {
  const freeCells = context.board.emptyCount(FreeCellRole.CELL);
  const emptyColumns = context.board.emptyCount(FreeCellRole.TABLEAU);
  const usableColumns = context.targetPile.isEmpty
    ? Math.max(0, emptyColumns - 1)
    : emptyColumns;
  return (freeCells + 1) * 2 ** usableColumns;
}

/**
 * A FreeCell column: any card may start an empty one, anything after builds
 * down in alternating colors, and no more may move at once than the board can
 * actually shuffle around.
 */
export const FREECELL_TABLEAU_RULE: PlacementRule = all(
  byEmptiness(anyCard, descendingAlternatingColor),
  maxStackSize(supermoveLimit),
);

/** A free cell: one card, any card. */
export const FREECELL_CELL_RULE: PlacementRule = all(singleCardOnly, anyCard);

/** A FreeCell foundation: the standard Ace-up-by-suit pile. */
export const FREECELL_FOUNDATION_RULE: PlacementRule = suitFoundation;

/**
 * Whether `upper` may sit directly on `lower` within a movable run: one rank
 * down, in the other colour.
 */
export function isOrderedPair(lower: PlayingCard, upper: PlayingCard): boolean {
  return upper.rank === rankBelow(lower.rank) && isRed(lower) !== isRed(upper);
}

/**
 * The rule governing what a pile of the given role accepts, or null for a role
 * that is never a destination. Every FreeCell pile is one, so nothing is null —
 * which is itself worth noting: the game has no stock and no waste.
 */
export function freeCellPlacementRule(role: string): PlacementRule | null {
  switch (role) {
    case FreeCellRole.TABLEAU:
      return FREECELL_TABLEAU_RULE;
    case FreeCellRole.CELL:
      return FREECELL_CELL_RULE;
    case FreeCellRole.FOUNDATION:
      return FREECELL_FOUNDATION_RULE;
    default:
      return null;
  }
}
