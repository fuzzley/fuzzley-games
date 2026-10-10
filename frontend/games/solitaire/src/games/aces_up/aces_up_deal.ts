import { Deal } from "@/engine/tableau/dealing/deal";
import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";

/**
 * Deals one card face up to each column and leaves the rest face down in the
 * stock.
 */
export function dealAcesUpLayout(
  deal: Deal,
  tableaus: readonly ReadonlyCardPile<PlayingCard>[],
  stock: ReadonlyCardPile<PlayingCard>,
): void {
  deal.dealEach(tableaus, true);
  deal.dealRest(stock, false);
}
