import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";

/**
 * Deals `deck` face up, giving each column as many cards as `cardsPerColumn`
 * says.
 *
 * @param deck The cards to deal, which this drains from the end.
 * @param cardsPerColumn How many cards each column is dealt, left to right.
 */
export function dealSimpleSimonLayout(
  deck: PlayingCard[],
  tableaus: readonly CardPile<PlayingCard>[],
  cardsPerColumn: readonly number[],
): void {
  for (const [column, tableau] of tableaus.entries()) {
    const count = cardsPerColumn[column] ?? 0;
    for (let dealt = 0; dealt < count; dealt++) {
      const card = deck.pop();
      if (!card) return;
      card.faceUp = true;
      tableau.addCard(card);
    }
  }
}
