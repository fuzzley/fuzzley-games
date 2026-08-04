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

/**
 * The forty-eight cards Montana plays with: a standard deck without its Aces.
 *
 * The Aces are traditionally dealt and then lifted out, which is the same thing
 * as never dealing them — except that leaving them out of the deck entirely
 * means the game has forty-eight cards in play rather than fifty-two with four
 * of them stranded off the board. The win counts what is in play, so it matters
 * which of the two the model believes.
 */
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
 * The four gaps are where the Aces would have fallen, so they are four
 * uniformly random positions rather than four chosen ones — which is the whole
 * of the opening's luck. A deal that put them at the ends of the rows would be a
 * different, and much easier, game.
 *
 * @param deck The cards to deal, which this drains.
 * @param cells The grid, row-major.
 * @param random Source of randomness in [0, 1), injectable for a fixed deal.
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
 * `count` distinct cell indices below `total`, drawn without replacement.
 *
 * Shuffles the positions and takes a prefix rather than drawing indices until
 * enough distinct ones turn up. The rejection loop is the obvious way to write
 * this and it does not terminate: a random source that keeps returning the same
 * value — a stuck sensor, a test double past the end of its sequence — spins it
 * forever. Fisher-Yates draws exactly `total - 1` times whatever the source
 * does.
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

/** One row's cells, left to right. */
export function rowOf(
  cells: readonly CardPile<PlayingCard>[],
  row: number,
): readonly CardPile<PlayingCard>[] {
  return cells.slice(row * COLUMN_COUNT, (row + 1) * COLUMN_COUNT);
}

/** The grid as rows, in order. */
export function rowsOf(
  cells: readonly CardPile<PlayingCard>[],
): readonly (readonly CardPile<PlayingCard>[])[] {
  return Array.from({ length: ROW_COUNT }, (_, row) => rowOf(cells, row));
}

/**
 * Where every card should sit after a redeal: the settled prefixes stay, a gap
 * opens immediately after each, and everything else is shuffled back in.
 *
 * Returning the arrangement rather than performing it keeps the shuffle and the
 * bookkeeping apart — the game still has to record which card moved where so a
 * single undo can take the whole redeal back.
 *
 * @param cells The grid, row-major.
 * @param shuffled The gathered cards, already shuffled.
 * @returns The card each cell should hold, or null for a cell left empty.
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
