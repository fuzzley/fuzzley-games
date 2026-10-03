import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";

/** How many cards each column is dealt. */
export const CARDS_PER_COLUMN = 7;

/**
 * Deals seven face-up cards to each column, in rows. The first card is the
 * beak; each other card of its rank goes to the next foundation as it turns
 * up, and the card after it takes its place.
 *
 * @param deck The cards to deal, which this drains.
 */
export function dealPenguinLayout(
  deck: PlayingCard[],
  foundations: readonly CardPile<PlayingCard>[],
  tableaus: readonly CardPile<PlayingCard>[],
): void {
  const beak = deck.at(-1);
  let nextFoundation = 0;

  for (let row = 0; row < CARDS_PER_COLUMN; row++) {
    for (const tableau of tableaus) {
      let card = deck.pop();
      while (card && card !== beak && card.rank === beak?.rank) {
        card.faceUp = true;
        foundations[nextFoundation++]?.addCard(card);
        card = deck.pop();
      }
      if (!card) return;
      card.faceUp = true;
      tableau.addCard(card);
    }
  }
}
