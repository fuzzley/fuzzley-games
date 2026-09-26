import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";

/** How many cards each column is dealt, left to right. */
export const CARDS_PER_COLUMN: readonly number[] = [
  8, 8, 8, 7, 6, 5, 4, 3, 2, 1,
];

/**
 * Deals `deck` face up into the Simple Simon opening layout.
 *
 * @param deck The cards to deal, which this drains from the end.
 */
export function dealSimpleSimonLayout(
  deck: PlayingCard[],
  tableaus: readonly CardPile<PlayingCard>[],
): void {
  for (let column = 0; column < tableaus.length; column++) {
    const count = CARDS_PER_COLUMN[column] ?? 0;
    for (let dealt = 0; dealt < count; dealt++) {
      const card = deck.pop();
      if (!card) return;
      card.faceUp = true;
      tableaus[column].addCard(card);
    }
  }
}
