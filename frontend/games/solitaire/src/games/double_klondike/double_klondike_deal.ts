import { CardPile } from "@/engine/core/card/card_pile";
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
 *
 * @param deck The cards to deal, which this drains from the end.
 */
export function dealDoubleKlondikeLayout(
  deck: PlayingCard[],
  tableaus: readonly CardPile<PlayingCard>[],
  stock: CardPile<PlayingCard>,
): void {
  for (let column = 0; column < tableaus.length; column++) {
    for (let dealt = 0; dealt <= column; dealt++) {
      const card = deck.pop();
      // A short injected deck simply runs out; the columns already dealt stand
      // as they are rather than the deal failing.
      if (!card) return;
      card.faceUp = dealt === column;
      tableaus[column].addCard(card);
    }
  }

  while (deck.length > 0) {
    const card = deck.pop();
    if (!card) break;
    card.faceUp = false;
    stock.addCard(card);
  }
}
