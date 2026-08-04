import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { dealColumnsThenCells } from "@/games/common/row_deal";

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
 * The shared cell-game opening; see {@link dealColumnsThenCells} for what it
 * does with a short deck and why the cells are filled last.
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
  dealColumnsThenCells(deck, tableaus, cells, CARDS_PER_COLUMN);
}
