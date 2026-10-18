import { Deal } from "@/engine/tableau/dealing/deal";
import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { DeckSpec } from "@/engine/core/card/deck";
import { PlayingCard, Rank } from "@/engine/core/card/playing_card";
import { seedFrom, seededRandom } from "@/engine/core/random/seeded_random";
import { shuffle } from "@/engine/core/random/shuffle";
import { itemAt } from "@/engine/core/common/item_at";
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
 * @param rows The grid, row by row.
 */
export function dealMontanaFamilyLayout(
  variant: MontanaVariant,
  deal: Deal,
  rows: readonly (readonly ReadonlyCardPile<PlayingCard>[])[],
): void {
  switch (variant) {
    case MontanaVariant.MONTANA:
      dealMontanaLayout(deal, rows.flat());
      return;
    case MontanaVariant.BLUE_MOON:
      dealBlueMoonLayout(deal, rows);
      return;
    case MontanaVariant.RED_MOON:
      dealRedMoonLayout(deal, rows);
      return;
  }
}

/**
 * Deals `deck` across the grid, leaving four cells empty at random.
 *
 * The gaps are drawn from the order of the deck rather than a fresh source, so
 * a restart, which deals the same order again, leaves the same gaps.
 *
 * @param cells The grid, row-major.
 */
export function dealMontanaLayout(
  deal: Deal,
  cells: readonly ReadonlyCardPile<PlayingCard>[],
): void {
  const random = seededRandom(seedFrom(deal.undealt.map((card) => card.id)));
  const gaps = chooseGaps(cells.length, GAP_COUNT, random);

  for (const [index, cell] of cells.entries()) {
    if (gaps.has(index)) continue;
    // A short injected deck simply leaves the later cells empty.
    if (!deal.dealTo(cell, true)) return;
  }
}

/**
 * Deals Blue Moon's opening: the whole deck across every column but the first,
 * then each Ace, in reading order, to the start of the next row, leaving a gap
 * where it was.
 */
export function dealBlueMoonLayout(
  deal: Deal,
  rows: readonly (readonly ReadonlyCardPile<PlayingCard>[])[],
): void {
  deal.dealEach(
    rows.flatMap((row) => row.slice(1)),
    true,
  );

  const aceCells = rows
    .flat()
    .filter((cell) => cell.topCard?.rank === Rank.ACE);
  aceCells.slice(0, rows.length).forEach((cell, index) => {
    const ace = cell.topCard;
    if (ace) deal.place(ace, itemAt(itemAt(rows, index), 0), true);
  });
}

/**
 * Deals Red Moon's opening: an Ace to the start of every row, a gap beside
 * each, and the rest of the deck across the remaining columns.
 */
export function dealRedMoonLayout(
  deal: Deal,
  rows: readonly (readonly ReadonlyCardPile<PlayingCard>[])[],
): void {
  const aces = deal.pull((card) => card.rank === Rank.ACE);
  aces.slice(0, rows.length).forEach((ace, index) => {
    deal.place(ace, itemAt(itemAt(rows, index), 0), true);
  });

  deal.dealEach(
    rows.flatMap((row) => row.slice(2)),
    true,
  );
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
  cells: readonly ReadonlyCardPile<PlayingCard>[],
  columnCount: number,
): readonly (readonly ReadonlyCardPile<PlayingCard>[])[] {
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
  rows: readonly (readonly ReadonlyCardPile<PlayingCard>[])[],
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
