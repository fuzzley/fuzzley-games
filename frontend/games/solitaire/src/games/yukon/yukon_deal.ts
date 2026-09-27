import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";

/** How many face-up cards every column but the first receives. */
export const FACE_UP_PER_COLUMN = 5;

/**
 * Deals the whole deck across the columns: one card on the first, then i
 * face-down cards under five face-up ones on column i.
 *
 * @param deck The cards to deal, which this drains from the end.
 */
export function dealYukonLayout(
  deck: PlayingCard[],
  tableaus: readonly CardPile<PlayingCard>[],
): void {
  for (const [column, tableau] of tableaus.entries()) {
    // The first column is the exception in both directions: no cards buried
    // under it, and a single card on it rather than five.
    const faceUpCount = column === 0 ? 1 : FACE_UP_PER_COLUMN;

    for (let dealt = 0; dealt < column + faceUpCount; dealt++) {
      const card = deck.pop();
      // A short injected deck simply runs out; the columns already dealt stand
      // as they are rather than the deal failing.
      if (!card) return;
      // The first `column` cards of a column are its buried ones.
      card.faceUp = dealt >= column;
      tableau.addCard(card);
    }
  }
}
