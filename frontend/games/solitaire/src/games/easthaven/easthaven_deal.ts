import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";

/** How many cards each column opens with: three, of which the top one shows. */
export const CARDS_PER_COLUMN = 3;

/**
 * Deals seven columns of three, two buried under one showing, and puts the rest
 * face down on the stock.
 *
 * @param deck The cards to deal, which this drains.
 */
export function dealEasthavenLayout(
  deck: PlayingCard[],
  tableaus: readonly CardPile<PlayingCard>[],
  stock: CardPile<PlayingCard>,
): void {
  if (tableaus.length === 0) return;

  for (const tableau of tableaus) {
    for (let dealt = 0; dealt < CARDS_PER_COLUMN; dealt++) {
      const card = deck.pop();
      if (!card) return;
      card.faceUp = dealt === CARDS_PER_COLUMN - 1;
      tableau.addCard(card);
    }
  }

  while (deck.length > 0) {
    const card = deck.pop();
    if (!card) break;
    card.faceUp = false;
    stock.addCard(card);
  }
}
