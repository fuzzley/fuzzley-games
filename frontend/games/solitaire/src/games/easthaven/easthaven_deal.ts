import { Deal } from "@/engine/tableau/deal";
import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";

/** How many cards each column opens with: three, of which the top one shows. */
export const CARDS_PER_COLUMN = 3;

/**
 * Deals seven columns of three, two buried under one showing, and puts the rest
 * face down on the stock.
 */
export function dealEasthavenLayout(
  deal: Deal,
  tableaus: readonly ReadonlyCardPile<PlayingCard>[],
  stock: ReadonlyCardPile<PlayingCard>,
): void {
  if (tableaus.length === 0) return;

  for (const tableau of tableaus) {
    for (let dealt = 0; dealt < CARDS_PER_COLUMN; dealt++) {
      if (!deal.dealTo(tableau, dealt === CARDS_PER_COLUMN - 1)) return;
    }
  }
  deal.dealRest(stock, false);
}
