import { CardPile } from "@/engine/core/card/card_pile";
import { DeckSpec } from "@/engine/core/card/deck";
import {
  ALL_RANKS,
  ALL_SUITS,
  PlayingCard,
  Rank,
} from "@/engine/core/card/playing_card";
import { shuffle } from "@/engine/core/random/shuffle";
import { COLUMN_COUNT, ROW_COUNT, settledPrefixLength } from "./montana_rules";

/** The forty-eight cards Montana plays with: a standard deck minus its Aces. */
export const MONTANA_DECK: DeckSpec = {
  suits: ALL_SUITS,
  ranks: ALL_RANKS.filter((rank) => rank !== Rank.ACE),
  copies: 1,
};

/** How many gaps the board has: one per row, and never more or fewer. */
export const GAP_COUNT = ROW_COUNT;

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

  for (let index = 0; index < cells.length; index++) {
    if (gaps.has(index)) continue;
    const card = deck.pop();
    // A short injected deck simply leaves the later cells empty.
    if (!card) return;
    card.faceUp = true;
    cells[index].addCard(card);
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

/** Returns one row's cells, left to right. */
export function rowOf(
  cells: readonly CardPile<PlayingCard>[],
  row: number,
): readonly CardPile<PlayingCard>[] {
  return cells.slice(row * COLUMN_COUNT, (row + 1) * COLUMN_COUNT);
}

/** Returns the grid as rows, in order. */
export function rowsOf(
  cells: readonly CardPile<PlayingCard>[],
): readonly (readonly CardPile<PlayingCard>[])[] {
  return Array.from({ length: ROW_COUNT }, (_, row) => rowOf(cells, row));
}

/**
 * Returns the card each cell should hold after a redeal, or null for a gap:
 * each row keeps its settled run, a gap follows it, and `shuffled` fills the
 * rest.
 *
 * @param cells The grid, row-major.
 */
export function redealArrangement(
  cells: readonly CardPile<PlayingCard>[],
  shuffled: readonly PlayingCard[],
): readonly (PlayingCard | null)[] {
  const placed: (PlayingCard | null)[] = Array.from(
    { length: cells.length },
    () => null,
  );
  let next = 0;

  rowsOf(cells).forEach((row, rowIndex) => {
    const settled = settledPrefixLength(row);
    const base = rowIndex * COLUMN_COUNT;

    for (let column = 0; column < COLUMN_COUNT; column++) {
      if (column < settled) {
        placed[base + column] = row[column].topCard ?? null;
        continue;
      }
      // The cell immediately after a settled run is the row's gap; everything
      // beyond it takes a shuffled card.
      if (column === settled) continue;
      placed[base + column] = shuffled[next++] ?? null;
    }
  });

  return placed;
}
