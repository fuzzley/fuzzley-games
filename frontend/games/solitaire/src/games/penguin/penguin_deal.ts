import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";

/** How many cards a full deck deals to each column. */
export const CARDS_PER_COLUMN = 7;

/**
 * Deals the whole deck face-up to the columns, a row at a time. The first card
 * is the beak; each other card of its rank goes to the next foundation as it
 * turns up, and the card after it takes its place.
 *
 * A card of the beak's rank can be the last card in the deck, turning up only
 * after the last row is full, so the deal runs until the deck is empty rather
 * than until the columns are.
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
  let nextColumn = 0;

  for (let card = deck.pop(); card; card = deck.pop()) {
    card.faceUp = true;
    if (card !== beak && card.rank === beak?.rank) {
      foundations[nextFoundation++]?.addCard(card);
    } else {
      tableaus[nextColumn++ % tableaus.length]?.addCard(card);
    }
  }
}
