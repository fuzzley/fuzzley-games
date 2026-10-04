import { Deal } from "@/engine/tableau/deal";
import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";

/** How many cards each column is dealt. */
export const COLUMN_SIZE = 7;

/** How many cards each column that hides any hides. */
export const HIDDEN_PER_COLUMN = 3;

/**
 * Deals the Scorpion opening layout: seven cards to every column, the first
 * `hiddenColumnCount` columns hiding their first three, and whatever is left
 * over face-down onto the stock.
 */
export function dealScorpionLayout(
  deal: Deal,
  tableaus: readonly ReadonlyCardPile<PlayingCard>[],
  stock: ReadonlyCardPile<PlayingCard>,
  hiddenColumnCount: number,
): void {
  for (const [column, tableau] of tableaus.entries()) {
    const hidden = column < hiddenColumnCount ? HIDDEN_PER_COLUMN : 0;
    for (let depth = 0; depth < COLUMN_SIZE; depth++) {
      // A short deck simply runs out: the remaining columns stay empty and
      // there is nothing left for the stock either.
      if (!deal.dealTo(tableau, depth >= hidden)) return;
    }
  }
  deal.dealRest(stock, false);
}
