import { CardPile, PileRole } from "@/engine/core/card/card_pile";
import { PlayingCard, Rank, rankAbove } from "@/engine/core/card/playing_card";
import {
  PlacementRule,
  all,
  cardIs,
  hasRank,
  singleCardOnly,
} from "@/engine/tableau/rules";

/** The parts a pile can play in a Montana game. */
export const MontanaRole = {
  /** One of the fifty-two positions in the grid, holding at most one card. */
  CELL: "cell",
  /** The marker a player presses to redeal, which never holds a card. */
  REDEAL: "redeal",
} as const satisfies Record<string, PileRole>;

/** Names one of the parts a Montana pile can play. */
export type MontanaRole = (typeof MontanaRole)[keyof typeof MontanaRole];

/** How many columns the grid has: one per rank the game plays with, plus one. */
export const COLUMN_COUNT = 13;

/** How many rows the grid has: one per suit. */
export const ROW_COUNT = 4;

/**
 * How many cards a finished row holds: Two through King, with the gap at the
 * end.
 */
export const CARDS_PER_ROW = COLUMN_COUNT - 1;

/**
 * Returns what a cell accepts: any Two in the leftmost column, and elsewhere
 * the card one rank above its left neighbour, in the same suit.
 *
 * @param leftPileId The cell to the left, or null for the leftmost column.
 */
export function montanaCellRule(leftPileId: string | null): PlacementRule {
  if (leftPileId === null) {
    return all(singleCardOnly, cardIs(hasRank(Rank.TWO)));
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
 * run from the Two up, in one suit.
 */
export function settledPrefixLength(
  row: readonly CardPile<PlayingCard>[],
): number {
  const first = row[0]?.topCard;
  if (!first || first.rank !== Rank.TWO) return 0;

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

/** Returns whether every row holds Two through King of a single suit. */
export function isMontanaSolved(
  rows: readonly (readonly CardPile<PlayingCard>[])[],
): boolean {
  return rows.every((row) => settledPrefixLength(row) === CARDS_PER_ROW);
}
