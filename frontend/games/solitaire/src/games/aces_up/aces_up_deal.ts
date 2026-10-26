import type { Deal } from "@/engine/tableau/dealing/deal";
import type { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import type { PlayingCard } from "@/engine/core/card/playing_card";

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
