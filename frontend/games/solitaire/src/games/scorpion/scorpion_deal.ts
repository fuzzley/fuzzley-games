import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";

/** How many cards each column is dealt. */
export const COLUMN_SIZE = 7;

/** How many columns start with face-down cards buried under their face-up ones. */
export const HIDDEN_COLUMN_COUNT = 4;

/** How many cards those columns hide. */
export const HIDDEN_PER_COLUMN = 3;

/**
 * Deals the Scorpion opening layout: seven cards to every column, the first
 * four columns hiding their first three, and whatever is left over face-down
 * onto the stock.
 *
 * The whole deck goes out at once bar three, and twelve of the forty-nine dealt
 * cards are hidden. That is the entire difficulty setting of the game:
 * everything else is visible from the first move, so a lost Scorpion is lost to
 * a decision rather than to a card you could not see.
 *
 * Column by column rather than round-robin, because which cards are hidden is
 * positional here — the bottom three of the first four columns — and dealing
 * across the board would put them somewhere else.
 *
 * @param deck The cards to deal, which this drains.
 * @param tableaus The columns to deal onto.
 * @param stock The stock to fill with the remainder.
 */
export function dealScorpionLayout(
  deck: PlayingCard[],
  tableaus: readonly CardPile<PlayingCard>[],
  stock: CardPile<PlayingCard>,
): void {
  for (let column = 0; column < tableaus.length; column++) {
    const hidden = column < HIDDEN_COLUMN_COUNT ? HIDDEN_PER_COLUMN : 0;
    for (let depth = 0; depth < COLUMN_SIZE; depth++) {
      const card = deck.pop();
      // A short deck simply runs out: the remaining columns stay empty and
      // there is nothing left for the stock either.
      if (!card) return;
      card.faceUp = depth >= hidden;
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
