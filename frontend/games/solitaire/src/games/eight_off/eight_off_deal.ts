import { Deal } from "@/engine/tableau/deal";
import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { dealColumnsThenCells } from "@/games/common/row_deal";

/** How many cards each column is dealt, leaving four for the cells. */
export const CARDS_PER_COLUMN = 6;

/**
 * Deals `deck` face up, six to a column and the rest one to a cell.
 */
export function dealEightOffLayout(
  deal: Deal,
  tableaus: readonly ReadonlyCardPile<PlayingCard>[],
  cells: readonly ReadonlyCardPile<PlayingCard>[],
): void {
  dealColumnsThenCells(deal, tableaus, cells, CARDS_PER_COLUMN);
}
