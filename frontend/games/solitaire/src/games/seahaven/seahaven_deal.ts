import { Deal } from "@/engine/tableau/deal";
import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { dealColumnsThenCells } from "@/games/common/row_deal";

/** How many cards each column is dealt, leaving two for the cells. */
export const CARDS_PER_COLUMN = 5;

/**
 * Deals `deck` face up, five to a column and the rest one to a cell.
 */
export function dealSeahavenLayout(
  deal: Deal,
  tableaus: readonly CardPile<PlayingCard>[],
  cells: readonly CardPile<PlayingCard>[],
): void {
  dealColumnsThenCells(deal, tableaus, cells, CARDS_PER_COLUMN);
}
