import { CardPile, PileRole } from "@/engine/core/card/card_pile";
import { DeckSpec } from "@/engine/core/card/deck";
import {
  ALL_RANKS,
  ALL_SUITS,
  PlayingCard,
  Rank,
  rankAbove,
} from "@/engine/core/card/playing_card";
import {
  PlacementRule,
  all,
  cardIs,
  hasRank,
  singleCardOnly,
} from "@/engine/tableau/rules";

/** The parts a pile can play in a Montana game. */
export const MontanaRole = {
  /** One of the positions in the grid, holding at most one card. */
  CELL: "cell",
  /** The marker a player presses to redeal, which never holds a card. */
  REDEAL: "redeal",
} as const satisfies Record<string, PileRole>;

/** Names one of the parts a Montana pile can play. */
export type MontanaRole = (typeof MontanaRole)[keyof typeof MontanaRole];

/**
 * Which of the Montana family is being played.
 *
 * Numbered because the settings panel stores an option as a number, which the
 * catalog hands straight to the game.
 */
export const MontanaVariant = {
  /** Montana: the Aces left out, and every row sorted from Two up. */
  MONTANA: 0,
  /** Blue Moon: the Aces moved to the start of the rows, gaps where they were. */
  BLUE_MOON: 1,
  /** Red Moon: the Aces at the start of the rows, and the gaps beside them. */
  RED_MOON: 2,
} as const;

/** Names one of the games in the Montana family. */
export type MontanaVariant =
  (typeof MontanaVariant)[keyof typeof MontanaVariant];

/** The variant dealt when nothing says otherwise. */
export const DEFAULT_MONTANA_VARIANT: MontanaVariant = MontanaVariant.MONTANA;

/**
 * The rank each variant's rows start with: Two in Montana, which plays without
 * its Aces, and Ace in the Moons, where each Ace heads its row for good.
 */
const FIRST_RANKS: Readonly<Record<MontanaVariant, Rank>> = {
  [MontanaVariant.MONTANA]: Rank.TWO,
  [MontanaVariant.BLUE_MOON]: Rank.ACE,
  [MontanaVariant.RED_MOON]: Rank.ACE,
};

/** How many rows the grid has: one per suit. */
export const ROW_COUNT = 4;

/** Says how many redeals a game allows: two in Montana, three in Addiction. */
export type MaxRedeals = 2 | 3;

/** How many redeals a game allows when nothing says otherwise. */
export const DEFAULT_MAX_REDEALS: MaxRedeals = 2;

/** Returns the rank every row of `variant` starts with. */
export function montanaFirstRank(variant: MontanaVariant): Rank {
  return FIRST_RANKS[variant];
}

/** Returns the cards `variant` plays with: every rank from its first up. */
export function montanaDeck(variant: MontanaVariant): DeckSpec {
  const first = montanaFirstRank(variant);
  return {
    suits: ALL_SUITS,
    ranks: ALL_RANKS.filter((rank) => rank >= first),
    copies: 1,
  };
}

/**
 * Returns how many columns the grid of `variant` has: one per rank it plays
 * with, plus one for the gap a finished row ends on.
 */
export function montanaColumnCount(variant: MontanaVariant): number {
  return Rank.KING - montanaFirstRank(variant) + 2;
}

/**
 * Returns whether `variant` fixes a card in the first column of every row: the
 * Moons' Aces, which nothing can ever be placed before.
 */
export function montanaFirstColumnFixed(variant: MontanaVariant): boolean {
  return montanaFirstRank(variant) === Rank.ACE;
}

/**
 * Returns what a cell accepts: any card of `firstRank` in the leftmost column,
 * and elsewhere the card one rank above its left neighbour, in the same suit.
 *
 * @param leftPileId The cell to the left, or null for the leftmost column.
 */
export function montanaCellRule(
  leftPileId: string | null,
  firstRank: Rank,
): PlacementRule {
  if (leftPileId === null) {
    return all(singleCardOnly, cardIs(hasRank(firstRank)));
  }

  return all(singleCardOnly, (context) => {
    const anchor = context.board.pile(leftPileId)?.topCard;
    if (!anchor) return false;

    const wanted = rankAbove(anchor.rank);
    // A King has nothing above it, so the gap beyond one can never be filled.
    if (wanted === undefined) return false;

    return context.card.suit === anchor.suit && context.card.rank === wanted;
  });
}

/**
 * Returns how many cards of a row, from the left, are in their final places: a
 * run up from `firstRank`, in one suit.
 */
export function settledPrefixLength(
  row: readonly CardPile<PlayingCard>[],
  firstRank: Rank,
): number {
  const first = row[0]?.topCard;
  if (!first || first.rank !== firstRank) return 0;

  let length = 1;
  while (length < row.length) {
    const previous = row[length - 1]?.topCard;
    const next = row[length]?.topCard;
    if (!previous || !next) break;
    if (next.suit !== previous.suit) break;
    if (next.rank !== rankAbove(previous.rank)) break;
    length++;
  }
  return length;
}

/**
 * Returns whether every row holds a run from `firstRank` to King in a single
 * suit, which leaves only its last cell empty.
 */
export function isMontanaSolved(
  rows: readonly (readonly CardPile<PlayingCard>[])[],
  firstRank: Rank,
): boolean {
  return rows.every(
    (row) => settledPrefixLength(row, firstRank) === row.length - 1,
  );
}
