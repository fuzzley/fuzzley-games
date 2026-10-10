import { Deal } from "@/engine/tableau/dealing/deal";
import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { DeckSpec } from "@/engine/core/card/deck";
import {
  ALL_RANKS,
  ALL_SUITS,
  PlayingCard,
} from "@/engine/core/card/playing_card";

/** Two full decks: 104 cards, with two of every face. */
export const DOUBLE_KLONDIKE_TWO_DECKS: DeckSpec = {
  suits: ALL_SUITS,
  ranks: ALL_RANKS,
  copies: 2,
};

/**
 * Deals the Double Klondike opening: column i receives i + 1 cards with only
 * its top card face up, and the rest go face down onto the stock.
 */
export function dealDoubleKlondikeLayout(
  deal: Deal,
  tableaus: readonly ReadonlyCardPile<PlayingCard>[],
  stock: ReadonlyCardPile<PlayingCard>,
): void {
  for (const [column, tableau] of tableaus.entries()) {
    for (let dealt = 0; dealt <= column; dealt++) {
      // A short injected deck simply runs out; the columns already dealt stand
      // as they are rather than the deal failing.
      if (!deal.dealTo(tableau, dealt === column)) return;
    }
  }
  deal.dealRest(stock, false);
}
