import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { dealColumnsThenCells } from "@/games/common/row_deal";

/** How many cards each column is dealt, leaving four for the cells. */
export const CARDS_PER_COLUMN = 6;

/**
 * Deals `deck` face up, six to a column and the rest one to a cell.
 *
 * @param deck The cards to deal, which this drains.
 */
export function dealEightOffLayout(
  deck: PlayingCard[],
  tableaus: readonly CardPile<PlayingCard>[],
  cells: readonly CardPile<PlayingCard>[],
): void {
  dealColumnsThenCells(deck, tableaus, cells, CARDS_PER_COLUMN);
}
