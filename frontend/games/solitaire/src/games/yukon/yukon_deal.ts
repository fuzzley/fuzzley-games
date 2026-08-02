import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";

/**
 * How many face-up cards every column but the first receives.
 *
 * The five is what makes Yukon Yukon. Klondike shows one card per column and
 * hides the rest behind a stock; Yukon has no stock at all, so it puts five
 * face-up cards on each column instead and asks the player to work with
 * everything they can see.
 */
export const FACE_UP_PER_COLUMN = 5;

/**
 * Deals `deck` across the columns in the Yukon shape, consuming it from the
 * top (end).
 *
 * The whole deck goes onto the columns: one card on the first, then column i
 * takes i face-down cards under its five face-up ones. That comes to
 * 1 + 6 + 7 + 8 + 9 + 10 + 11 = 52, which is why the family needs no stock and
 * why it deals in exactly this shape.
 *
 * @param deck The cards to deal, which this drains.
 * @param tableaus The columns to deal onto.
 */
export function dealYukonLayout(
  deck: PlayingCard[],
  tableaus: readonly CardPile<PlayingCard>[],
): void {
  for (let column = 0; column < tableaus.length; column++) {
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
      tableaus[column].addCard(card);
    }
  }
}
