import { PileRole } from "@/engine/core/card/card_pile";
import { Rank } from "@/engine/core/card/playing_card";
import {
  PlacementContext,
  PlacementRule,
  anyCard,
  cardIs,
  cellStagingLimit,
  hasRank,
  isOrderedPair,
  isSameSuitRun,
  singleCardCell,
  suitFoundation,
} from "@/engine/tableau/rules";
import {
  ColumnRules,
  RunColumnOptions,
  runColumn,
} from "@/engine/tableau/zone";

/** The parts a pile can play in a FreeCell game. */
export const FreeCellRole = {
  /** A single-card holding cell. */
  CELL: "cell",
  /** A suit pile built up from Ace to King. */
  FOUNDATION: "foundation",
  /** A board column built down in alternating colors. */
  TABLEAU: "tableau",
} as const satisfies Record<string, PileRole>;

/** Names one of the parts a FreeCell pile can play. */
export type FreeCellRole = (typeof FreeCellRole)[keyof typeof FreeCellRole];

/**
 * Which set of column rules a FreeCell board is played by.
 *
 * Kings-only empty columns is a variant rather than a flag because it changes
 * both what an empty column accepts and how far a supermove reaches.
 */
export const FreeCellVariant = {
  /** Standard FreeCell: build down in alternating colours. */
  FREECELL: "freecell",
  /** Baker's Game: build down in suit, any card into an empty column. */
  BAKERS: "bakers",
  /** Baker's Game with only a King allowed to start an empty column. */
  BAKERS_KINGS_ONLY: "bakers-kings-only",
  /** Challenge FreeCell: FreeCell with the Aces and Twos dealt underneath. */
  CHALLENGE: "challenge",
  /** Super Challenge FreeCell: Challenge FreeCell with Kings-only spaces. */
  SUPER_CHALLENGE: "super-challenge",
} as const;

/** Names one of the rule sets a FreeCell board can be played by. */
export type FreeCellVariant =
  (typeof FreeCellVariant)[keyof typeof FreeCellVariant];

/**
 * Returns how many cards may be moved at once:
 * `(free cells + 1) x 2 ^ (empty columns)`.
 *
 * An empty destination column does not count, since it cannot stage part of
 * the run that is moving into it.
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
 * column: `free cells + 1`, as {@link cellStagingLimit} explains.
 */
export const kingsOnlySupermoveLimit = cellStagingLimit(FreeCellRole.CELL);

/** Holds what a variant changes about its columns, and how it deals. */
interface VariantRules extends RunColumnOptions {
  /** Whether the deal puts the Aces and Twos at the bottom of the columns. */
  readonly buriesAcesAndTwos: boolean;
}

/** What each variant changes, in one table. */
const VARIANT_RULES: Readonly<Record<FreeCellVariant, VariantRules>> = {
  [FreeCellVariant.FREECELL]: {
    adjacent: isOrderedPair,
    whenEmpty: anyCard,
    maxStack: supermoveLimit,
    buriesAcesAndTwos: false,
  },
  [FreeCellVariant.BAKERS]: {
    adjacent: isSameSuitRun,
    whenEmpty: anyCard,
    maxStack: supermoveLimit,
    buriesAcesAndTwos: false,
  },
  [FreeCellVariant.BAKERS_KINGS_ONLY]: {
    adjacent: isSameSuitRun,
    whenEmpty: cardIs(hasRank(Rank.KING)),
    maxStack: kingsOnlySupermoveLimit,
    buriesAcesAndTwos: false,
  },
  [FreeCellVariant.CHALLENGE]: {
    adjacent: isOrderedPair,
    whenEmpty: anyCard,
    maxStack: supermoveLimit,
    buriesAcesAndTwos: true,
  },
  // In any descending run only the bottom card can be a King, whatever the
  // colours, so Kings-only spaces cap a supermove as they do in Baker's Game.
  [FreeCellVariant.SUPER_CHALLENGE]: {
    adjacent: isOrderedPair,
    whenEmpty: cardIs(hasRank(Rank.KING)),
    maxStack: kingsOnlySupermoveLimit,
    buriesAcesAndTwos: true,
  },
};

/**
 * Returns what a column accepts under `variant`, supermove limit included,
 * and the runs that may be lifted from it.
 */
export function freeCellColumn(variant: FreeCellVariant): ColumnRules {
  return runColumn(VARIANT_RULES[variant]);
}

/** A free cell: one card, any card. */
export const FREECELL_CELL_RULE: PlacementRule = singleCardCell;

/** A FreeCell foundation: the standard Ace-up-by-suit pile. */
export const FREECELL_FOUNDATION_RULE: PlacementRule = suitFoundation;

/** Returns whether `variant` deals the Aces and Twos to the column bottoms. */
export function freeCellBuriesAcesAndTwos(variant: FreeCellVariant): boolean {
  return VARIANT_RULES[variant].buriesAcesAndTwos;
}
