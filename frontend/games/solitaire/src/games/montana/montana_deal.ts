import { CardPile } from "@/engine/core/card/card_pile";
import { DeckSpec } from "@/engine/core/card/deck";
import { PlayingCard, Rank } from "@/engine/core/card/playing_card";
import { shuffle } from "@/engine/core/random/shuffle";
import { itemAt } from "@/engine/core/common/item_at";
import { pullCards } from "@/games/common/pull_cards";
import {
  MontanaVariant,
  ROW_COUNT,
  montanaDeck,
  settledPrefixLength,
} from "./montana_rules";

/** The forty-eight cards Montana plays with: a standard deck minus its Aces. */
export const MONTANA_DECK: DeckSpec = montanaDeck(MontanaVariant.MONTANA);

/** How many gaps the board has: one per row, and never more or fewer. */
export const GAP_COUNT = ROW_COUNT;

/**
 * Deals the opening position of `variant` across the grid.
 *
 * @param deck The cards to deal, which this drains.
 * @param rows The grid, row by row.
 * @param random Places Montana's gaps.
 */
export function dealMontanaFamilyLayout(
  variant: MontanaVariant,
  deck: PlayingCard[],
  rows: readonly (readonly CardPile<PlayingCard>[])[],
  random: () => number = Math.random,
): void {
  switch (variant) {
    case MontanaVariant.MONTANA:
      dealMontanaLayout(deck, rows.flat(), random);
      return;
    case MontanaVariant.BLUE_MOON:
      dealBlueMoonLayout(deck, rows);
      return;
    case MontanaVariant.RED_MOON:
      dealRedMoonLayout(deck, rows);
      return;
  }
}

/**
 * Deals `deck` across the grid, leaving four cells empty at random.
 *
 * @param deck The cards to deal, which this drains.
 * @param cells The grid, row-major.
 */
export function dealMontanaLayout(
  deck: PlayingCard[],
  cells: readonly CardPile<PlayingCard>[],
  random: () => number = Math.random,
): void {
  const gaps = chooseGaps(cells.length, GAP_COUNT, random);

  for (const [index, cell] of cells.entries()) {
    if (gaps.has(index)) continue;
    const card = deck.pop();
    // A short injected deck simply leaves the later cells empty.
    if (!card) return;
    card.faceUp = true;
    cell.addCard(card);
  }
}

/**
 * Deals Blue Moon's opening: the whole deck across every column but the first,
 * then each Ace, in reading order, to the start of the next row, leaving a gap
 * where it was.
 *
 * @param deck The cards to deal, which this drains.
 */
export function dealBlueMoonLayout(
  deck: PlayingCard[],
  rows: readonly (readonly CardPile<PlayingCard>[])[],
): void {
  dealFaceUp(
    deck,
    rows.flatMap((row) => row.slice(1)),
  );

  const aceCells = rows
    .flat()
    .filter((cell) => cell.topCard?.rank === Rank.ACE);
  aceCells.slice(0, rows.length).forEach((cell, index) => {
    const ace = cell.topCard;
    if (!ace) return;
    cell.removeCard(ace);
    itemAt(itemAt(rows, index), 0).addCard(ace);
  });
}

/**
 * Deals Red Moon's opening: an Ace to the start of every row, a gap beside
 * each, and the rest of the deck across the remaining columns.
 *
 * @param deck The cards to deal, which this drains.
 */
export function dealRedMoonLayout(
  deck: PlayingCard[],
  rows: readonly (readonly CardPile<PlayingCard>[])[],
): void {
  const aces = pullCards(deck, (card) => card.rank === Rank.ACE);
  aces.slice(0, rows.length).forEach((ace, index) => {
    ace.faceUp = true;
    itemAt(itemAt(rows, index), 0).addCard(ace);
  });

  dealFaceUp(
    deck,
    rows.flatMap((row) => row.slice(2)),
  );
}

/**
 * Deals one card face up into each cell in turn, until the deck or the cells
 * run out.
 *
 * @param deck The cards to deal, which this drains.
 */
function dealFaceUp(
  deck: PlayingCard[],
  cells: readonly CardPile<PlayingCard>[],
): void {
  for (const cell of cells) {
    const card = deck.pop();
    if (!card) return;
    card.faceUp = true;
    cell.addCard(card);
  }
}

/**
 * Returns `count` distinct cell indices below `total`, drawn without
 * replacement.
 *
 * Shuffling, rather than drawing until enough are distinct, means a random
 * source stuck on one value cannot loop forever.
 */
function chooseGaps(
  total: number,
  count: number,
  random: () => number,
): Set<number> {
  const positions = Array.from({ length: total }, (_, index) => index);
  shuffle(positions, random);
  return new Set(positions.slice(0, Math.min(count, total)));
}

/** Returns the grid as rows of `columnCount` cells, in order. */
export function rowsOf(
  cells: readonly CardPile<PlayingCard>[],
  columnCount: number,
): readonly (readonly CardPile<PlayingCard>[])[] {
  return Array.from({ length: ROW_COUNT }, (_, row) =>
    cells.slice(row * columnCount, (row + 1) * columnCount),
  );
}

/**
 * Returns the card each cell should hold after a redeal, or null for a gap:
 * each row keeps its settled run up from `firstRank`, a gap follows it, and
 * `shuffled` fills the rest.
 */
export function redealArrangement(
  rows: readonly (readonly CardPile<PlayingCard>[])[],
  shuffled: readonly PlayingCard[],
  firstRank: Rank,
): readonly (PlayingCard | null)[] {
  let next = 0;

  return rows.flatMap((row) => {
    const settled = settledPrefixLength(row, firstRank);
    return row.map((cell, column) => {
      if (column < settled) return cell.topCard ?? null;
      // The cell immediately after a settled run is the row's gap; everything
      // beyond it takes a shuffled card.
      if (column === settled) return null;
      return shuffled[next++] ?? null;
    });
  });
}
