import { PileRole } from "@/engine/core/card/card_pile";
import { PlayingCard, Rank } from "@/engine/core/card/playing_card";
import {
  PlacementContext,
  PlacementRule,
  all,
  anyCard,
  byEmptiness,
  cardIs,
  cellStagingLimit,
  descendingAlternatingColor,
  descendingSameSuit,
  hasRank,
  isOrderedPair,
  isSameSuitRun,
  maxStackSize,
  singleCardCell,
  suitFoundation,
} from "@/engine/tableau/rules";

/** The parts a pile can play in a FreeCell game. */
export const FreeCellRole = {
  /** A single-card holding cell. */
  CELL: "cell",
  /** A suit pile built up from Ace to King. */
  FOUNDATION: "foundation",
  /** A board column built down in alternating colors. */
  TABLEAU: "tableau",
} as const satisfies Record<string, PileRole>;

/** One of the parts a FreeCell pile can play. */
export type FreeCellRole = (typeof FreeCellRole)[keyof typeof FreeCellRole];

/**
 * Which set of column rules a FreeCell board is played by.
 *
 * Baker's Game is FreeCell with the alternating-colour build replaced by a
 * same-suit one — same deck, same deal, same cells, same foundations, same win.
 * Two lines of rules differ, so it is a variant of this module rather than a
 * module of its own.
 *
 * Kings-only empty columns is a value here rather than an independent flag
 * because it reshapes two rules at once: what an empty column accepts, *and*
 * how many cards a supermove may carry. A boolean beside the variant would let
 * a caller ask for Kings-only FreeCell, which is not a game anyone plays, and
 * would leave the two coupled rules free to be set inconsistently.
 */
export const FreeCellVariant = {
  /** Standard FreeCell: build down in alternating colours. */
  FREECELL: "freecell",
  /** Baker's Game: build down in suit, and any card may start an empty column. */
  BAKERS: "bakers",
  /** Baker's Game with only a King allowed to start an empty column. */
  BAKERS_KINGS_ONLY: "bakers-kings-only",
} as const;

/** One of the rule sets a FreeCell board can be played by. */
export type FreeCellVariant =
  (typeof FreeCellVariant)[keyof typeof FreeCellVariant];

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
 * How many cards may be moved at once when only a King may start an empty
 * column.
 *
 * `free cells + 1`, with no doubling at all — and this is exact, not a
 * conservative approximation. A moving run is descending in one suit, so its
 * only King is its bottom card. Every sub-run a supermove stages is a proper
 * suffix of that run, so its bottom card is never a King, so it can never be
 * parked in a Kings-only empty column. Empty columns therefore contribute zero
 * staging capacity, and the decomposition reduces to: park the top `F` cards in
 * cells, move the bottom card, replace the `F` cards.
 *
 * Keeping {@link supermoveLimit}'s `x 2 ^ (empty columns)` here would be the
 * same defect that function's doc warns about for the destination column — an
 * allowance the board cannot actually make good on.
 */
export const kingsOnlySupermoveLimit = cellStagingLimit(FreeCellRole.CELL);

/** The two halves of a variant's column rules, which have to agree. */
interface VariantRules {
  /** What a column accepts, empty or occupied, supermove limit included. */
  readonly tableau: PlacementRule;
  /** Whether `upper` may sit directly on `lower` within a liftable run. */
  readonly adjacent: (lower: PlayingCard, upper: PlayingCard) => boolean;
}

/**
 * What each variant changes, chosen together in one table.
 *
 * The build rule and the grab adjacency are stated side by side on purpose: a
 * run that can be lifted under one and not landed under the other is a bug that
 * only shows up mid-drag, and the pairing is the thing a reader has to check.
 */
const VARIANT_RULES: Readonly<Record<FreeCellVariant, VariantRules>> = {
  [FreeCellVariant.FREECELL]: {
    tableau: all(
      byEmptiness(anyCard, descendingAlternatingColor),
      maxStackSize(supermoveLimit),
    ),
    adjacent: isOrderedPair,
  },
  [FreeCellVariant.BAKERS]: {
    tableau: all(
      byEmptiness(anyCard, descendingSameSuit),
      maxStackSize(supermoveLimit),
    ),
    adjacent: isSameSuitRun,
  },
  [FreeCellVariant.BAKERS_KINGS_ONLY]: {
    tableau: all(
      byEmptiness(cardIs(hasRank(Rank.KING)), descendingSameSuit),
      maxStackSize(kingsOnlySupermoveLimit),
    ),
    adjacent: isSameSuitRun,
  },
};

/** A free cell: one card, any card. Every variant agrees. */
export const FREECELL_CELL_RULE: PlacementRule = singleCardCell;

/** A FreeCell foundation: the standard Ace-up-by-suit pile. */
export const FREECELL_FOUNDATION_RULE: PlacementRule = suitFoundation;

/**
 * Whether `upper` may sit directly on `lower` within a run under `variant`.
 *
 * Read from the same table as the build rule so a column cannot give up a run
 * its neighbours would refuse.
 */
export function freeCellRunAdjacency(
  variant: FreeCellVariant,
): (lower: PlayingCard, upper: PlayingCard) => boolean {
  return VARIANT_RULES[variant].adjacent;
}

/**
 * The rule governing what a pile of the given role accepts, or null for a role
 * that is never a destination. Every FreeCell pile is one, so nothing is null —
 * which is itself worth noting: the game has no stock and no waste.
 *
 * @param role The part the pile plays.
 * @param variant The rule set in play, which only the columns care about.
 */
export function freeCellPlacementRule(
  role: string,
  variant: FreeCellVariant,
): PlacementRule | null {
  switch (role) {
    case FreeCellRole.TABLEAU:
      return VARIANT_RULES[variant].tableau;
    case FreeCellRole.CELL:
      return FREECELL_CELL_RULE;
    case FreeCellRole.FOUNDATION:
      return FREECELL_FOUNDATION_RULE;
    default:
      return null;
  }
}
