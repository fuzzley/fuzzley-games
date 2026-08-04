import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard, Rank } from "@/engine/core/card/playing_card";

/** How many cards each column is dealt: four across thirteen columns is 52. */
export const CARDS_PER_COLUMN = 4;

/**
 * Deals `deck` four to a column, face up, with every King sunk to the bottom of
 * the column it landed in.
 *
 * Sinking the Kings is not a flourish, it is what makes the game playable. A
 * King can never be moved anywhere — nothing builds on it and no empty column
 * will take it — so a King dealt on top of a column would bury the three cards
 * beneath it for the whole game, and thirteen columns dealt at random would
 * usually strand several. Putting them underneath costs nothing, since the cards
 * above them stay reachable.
 *
 * The other cards keep the order they were dealt in. Only the Kings move, and
 * only to the bottom.
 *
 * A short injected deck simply deals fewer columns, leaving the rest empty.
 *
 * @param deck The cards to deal, which this drains.
 * @param tableaus The columns to deal onto.
 */
export function dealBakersDozenLayout(
  deck: PlayingCard[],
  tableaus: readonly CardPile<PlayingCard>[],
): void {
  for (const tableau of tableaus) {
    const column: PlayingCard[] = [];
    for (let dealt = 0; dealt < CARDS_PER_COLUMN; dealt++) {
      const card = deck.pop();
      if (!card) break;
      card.faceUp = true;
      column.push(card);
    }

    for (const card of sinkKings(column)) {
      tableau.addCard(card);
    }
  }
}

/**
 * The column reordered so its Kings sit at the bottom, each group otherwise
 * keeping the order it was dealt in.
 *
 * @param column The cards dealt to one column, in dealt order.
 */
function sinkKings(column: readonly PlayingCard[]): PlayingCard[] {
  const kings = column.filter((card) => card.rank === Rank.KING);
  const rest = column.filter((card) => card.rank !== Rank.KING);
  return [...kings, ...rest];
}
