import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";

/**
 * Deals one card face up to each column and leaves the rest face down in the
 * stock.
 *
 * @param deck The cards to deal, which this drains.
 */
export function dealAcesUpLayout(
  deck: PlayingCard[],
  tableaus: readonly CardPile<PlayingCard>[],
  stock: CardPile<PlayingCard>,
): void {
  for (const tableau of tableaus) {
    const card = deck.pop();
    if (!card) return;
    card.faceUp = true;
    tableau.addCard(card);
  }

  let card = deck.pop();
  while (card) {
    card.faceUp = false;
    stock.addCard(card);
    card = deck.pop();
  }
}
