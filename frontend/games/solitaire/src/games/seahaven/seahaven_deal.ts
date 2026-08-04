import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";

/**
 * How many cards each column is dealt.
 *
 * Five across ten columns is fifty, and the two the standard deck has left over
 * are what the opening cells hold — so the game begins with half its cells
 * already spent. That is the opening problem: two cells is barely enough to
 * move anything, and freeing them is usually the first order of business.
 */
export const CARDS_PER_COLUMN = 5;

/**
 * Deals `deck` five to a column, then puts whatever is left over one to a cell.
 *
 * Every card goes down face up, so there is nothing to turn over later and no
 * bonus for doing so — the player can see the whole position from the first
 * move, and the game is entirely one of planning.
 *
 * Short decks are dealt round-robin rather than column-by-column, so a deck too
 * small to fill the tableau still spreads across every column instead of
 * loading the first few and leaving the rest bare.
 *
 * @param deck The cards to deal, which this drains.
 * @param tableaus The columns to deal onto.
 * @param cells The cells the leftover cards go into.
 */
export function dealSeahavenLayout(
  deck: PlayingCard[],
  tableaus: readonly CardPile<PlayingCard>[],
  cells: readonly CardPile<PlayingCard>[],
): void {
  if (tableaus.length === 0) return;

  const toColumns = Math.min(deck.length, tableaus.length * CARDS_PER_COLUMN);
  for (let dealt = 0; dealt < toColumns; dealt++) {
    const card = deck.pop();
    if (!card) break;
    card.faceUp = true;
    tableaus[dealt % tableaus.length].addCard(card);
  }

  // One card per cell, and no more: a cell's capacity is declared on its zone
  // and enforced by the move rules, but CardPile.addCard takes whatever it is
  // given. Dealing straight into a pile bypasses the rules, so the limit has to
  // be honoured here as well as declared there.
  for (const cell of cells) {
    const card = deck.pop();
    if (!card) break;
    card.faceUp = true;
    cell.addCard(card);
  }
}
