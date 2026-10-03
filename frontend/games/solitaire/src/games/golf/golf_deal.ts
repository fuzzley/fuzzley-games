import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";

/** How many cards each column is dealt. */
export const CARDS_PER_COLUMN = 5;

/**
 * Deals five face-up cards to each column and one to start the foundation,
 * and leaves the rest face down in the stock.
 *
 * @param deck The cards to deal, which this drains.
 */
export function dealGolfLayout(
  deck: PlayingCard[],
  tableaus: readonly CardPile<PlayingCard>[],
  foundation: CardPile<PlayingCard>,
  stock: CardPile<PlayingCard>,
): void {
  for (let row = 0; row < CARDS_PER_COLUMN; row++) {
    for (const tableau of tableaus) {
      const card = deck.pop();
      if (!card) return;
      card.faceUp = true;
      tableau.addCard(card);
    }
  }

  const first = deck.pop();
  if (!first) return;
  first.faceUp = true;
  foundation.addCard(first);

  let card = deck.pop();
  while (card) {
    card.faceUp = false;
    stock.addCard(card);
    card = deck.pop();
  }
}
