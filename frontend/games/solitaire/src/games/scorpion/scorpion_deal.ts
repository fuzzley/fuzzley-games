import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";

/** How many cards each column is dealt. */
export const COLUMN_SIZE = 7;

/** How many columns start with face-down cards under their face-up ones. */
export const HIDDEN_COLUMN_COUNT = 4;

/** How many cards those columns hide. */
export const HIDDEN_PER_COLUMN = 3;

/**
 * Deals the Scorpion opening layout: seven cards to every column, the first
 * four columns hiding their first three, and whatever is left over face-down
 * onto the stock.
 *
 * @param deck The cards to deal, which this drains.
 */
export function dealScorpionLayout(
  deck: PlayingCard[],
  tableaus: readonly CardPile<PlayingCard>[],
  stock: CardPile<PlayingCard>,
): void {
  for (const [column, tableau] of tableaus.entries()) {
    const hidden = column < HIDDEN_COLUMN_COUNT ? HIDDEN_PER_COLUMN : 0;
    for (let depth = 0; depth < COLUMN_SIZE; depth++) {
      const card = deck.pop();
      // A short deck simply runs out: the remaining columns stay empty and
      // there is nothing left for the stock either.
      if (!card) return;
      card.faceUp = depth >= hidden;
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
