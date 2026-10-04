import { Deal } from "@/engine/tableau/deal";
import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";

/**
 * Deals one card face up to each column and leaves the rest face down in the
 * stock.
 */
export function dealAcesUpLayout(
  deal: Deal,
  tableaus: readonly CardPile<PlayingCard>[],
  stock: CardPile<PlayingCard>,
): void {
  deal.dealEach(tableaus, true);
  deal.dealRest(stock, false);
}
