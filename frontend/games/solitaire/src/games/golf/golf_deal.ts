import { Deal } from "@/engine/tableau/deal";
import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";

/** How many cards each column is dealt. */
export const CARDS_PER_COLUMN = 5;

/**
 * Deals five face-up cards to each column and one to start the foundation,
 * and leaves the rest face down in the stock.
 */
export function dealGolfLayout(
  deal: Deal,
  tableaus: readonly ReadonlyCardPile<PlayingCard>[],
  foundation: ReadonlyCardPile<PlayingCard>,
  stock: ReadonlyCardPile<PlayingCard>,
): void {
  for (let row = 0; row < CARDS_PER_COLUMN; row++) {
    if (!deal.dealEach(tableaus, true)) return;
  }
  if (!deal.dealTo(foundation, true)) return;
  deal.dealRest(stock, false);
}
