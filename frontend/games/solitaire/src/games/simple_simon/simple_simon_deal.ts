import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";

/**
 * How many cards each column is dealt, left to right.
 *
 * Three columns of eight and then a staircase down to one: 24 + 28 = 52, the
 * whole deck. The staircase is what gives the game its opening — the short
 * columns on the right are nearly free to dismantle, and clearing one outright
 * is the first thing a player looks for.
 */
export const CARDS_PER_COLUMN: readonly number[] = [8, 8, 8, 7, 6, 5, 4, 3, 2, 1];

/**
 * Deals `deck` into the Simple Simon opening layout, consuming it from the top
 * (end).
 *
 * Every card goes down face up: there is no stock and nothing hidden, so the
 * entire game is visible before the first move is made.
 *
 * A short injected deck simply runs out partway, leaving the columns already
 * dealt as they stand rather than failing.
 *
 * @param deck The cards to deal, which this drains.
 * @param tableaus The columns to deal onto.
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
