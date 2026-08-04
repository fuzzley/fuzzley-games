import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";

/**
 * How many cards each column opens with: three, of which the top one shows.
 *
 * Twenty-one on the board and thirty-one left on the stock — which is four full
 * rows of seven and a short row of three. That the stock does not divide evenly
 * is worth knowing alongside {@link EasthavenGame.canDeal}: the short row is the
 * one a player is most likely to be denied.
 */
export const CARDS_PER_COLUMN = 3;

/**
 * Deals the Easthaven opening layout and puts the rest on the stock.
 *
 * Seven columns of three, two buried under one showing. Klondike's shape without
 * its staircase, which is what makes the opening so much flatter: every column
 * offers exactly one card to work with.
 *
 * A short injected deck simply runs out; the columns already dealt stand as they
 * are rather than the deal failing.
 *
 * @param deck The cards to deal, which this drains.
 * @param tableaus The columns to deal onto.
 * @param stock The stock to fill with the remainder.
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
