import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { SpideretteVariant } from "./spiderette_rules";

/**
 * How many cards Will o' the Wisp puts on each column: three, of which the top
 * one shows.
 */
export const WISP_CARDS_PER_COLUMN = 3;

/**
 * Deals the opening layout for the given variant and puts the rest on the stock.
 *
 * The two differ only here. Spiderette takes Klondike's staircase — column i
 * gets i + 1 cards, 28 in all — and Will o' the Wisp deals a flat three to each,
 * 21 in all. Both bury everything but the top card of each column, and both send
 * what is left to the stock: 24 cards for Spiderette, 31 for Will o' the Wisp.
 *
 * Neither number divides by seven, which is the fact the stock rule downstream
 * has to accommodate — the last deal is a short row rather than a full one.
 *
 * @param deck The cards to deal, which this drains.
 * @param tableaus The columns to deal onto.
 * @param stock The stock to fill with the remainder.
 * @param variant Which of the two openings to lay out.
 */
export function dealSpideretteLayout(
  deck: PlayingCard[],
  tableaus: readonly CardPile<PlayingCard>[],
  stock: CardPile<PlayingCard>,
  variant: SpideretteVariant,
): void {
  if (tableaus.length === 0) return;

  for (let column = 0; column < tableaus.length; column++) {
    const count =
      variant === SpideretteVariant.WILL_O_THE_WISP
        ? WISP_CARDS_PER_COLUMN
        : column + 1;
    for (let dealt = 0; dealt < count; dealt++) {
      const card = deck.pop();
      // A short injected deck simply runs out; the columns already dealt stand
      // as they are rather than the deal failing.
      if (!card) return;
      card.faceUp = dealt === count - 1;
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
