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
  /** One of the fifty-two positions in the grid. Holds at most one card. */
  CELL: "cell",
  /** The marker a player presses to redeal. Never holds a card. */
  REDEAL: "redeal",
} as const satisfies Record<string, PileRole>;

/** One of the parts a Montana pile can play. */
export type MontanaRole = (typeof MontanaRole)[keyof typeof MontanaRole];

/** How many columns the grid has: one per rank the game plays with, plus one. */
export const COLUMN_COUNT = 13;

/** How many rows the grid has: one per suit. */
export const ROW_COUNT = 4;

/**
 * How many cards a finished row holds: Two through King.
 *
 * The Aces are not in play at all. Removing them is what creates the four gaps
 * the whole game is played through, and it is why a solved row is twelve cards
 * against thirteen cells — the thirteenth is the gap, parked harmlessly at the
 * end where nothing needs it.
 */
export const CARDS_PER_ROW = COLUMN_COUNT - 1;

/**
 * What the cell at the given position accepts.
 *
 * The rule that makes Montana unlike every other game here: a cell's rule is a
 * property of *where it is*, not of what is on it. A gap takes the card that
 * continues the run to its left, so the rule has to see a pile other than its
 * own target — which is what {@link BoardQuery} is for.
 *
 * Three cases, and the second two fall out of the first:
 *
 *  - The leftmost column starts a row, so it takes any Two.
 *  - Any other cell takes the card one rank above its left neighbour, in the
 *    same suit.
 *  - A cell whose left neighbour is a King, or is itself empty, takes nothing.
 *    A gap to the right of a King is dead for the rest of the deal, and that is
 *    the position a player is trying not to create.
 *
 * The neighbour is captured by id when the zones are built rather than parsed
 * back out of the cell's own id, so a renamed cell cannot quietly start asking
 * about the wrong neighbour.
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
 * How many cards of a row, counting from the left, are in their final places.
 *
 * A row is solved from the left or not at all: the run has to start with a Two
 * in the first cell and climb by one in a single suit. The first cell that
 * breaks the run ends the prefix, and everything from there on is gathered up by
 * a redeal.
 *
 * @param row The row's cells, left to right.
 */
export function settledPrefixLength(
  row: readonly CardPile<PlayingCard>[],
): number {
  const first = row[0]?.topCard;
  if (!first || first.rank !== Rank.TWO) return 0;

  let length = 1;
  while (length < row.length) {
    const previous = row[length - 1].topCard;
    const next = row[length]?.topCard;
    if (!previous || !next) break;
    if (next.suit !== previous.suit) break;
    if (next.rank !== rankAbove(previous.rank)) break;
    length++;
  }
  return length;
}

/**
 * Whether every row holds Two through King of a single suit.
 *
 * Montana's win, and the reason this game cannot use the engine's
 * `winsWhenAllCardsIn`: it is won by *arrangement* rather than by gathering
 * cards into some role. Every card is in a cell before the first move and still
 * in a cell after the last one; what changes is which cell.
 *
 * @param rows The grid, row by row and left to right within each.
 */
export function isMontanaSolved(
  rows: readonly (readonly CardPile<PlayingCard>[])[],
): boolean {
  return rows.every((row) => settledPrefixLength(row) === CARDS_PER_ROW);
}
