import { Deal } from "@/engine/tableau/dealing/deal";
import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { CardTransfer } from "@/engine/tableau/moves/move";
import { Tabletop } from "@/engine/tableau/game/tabletop";
import { collectCompletedRuns } from "./completed_runs";
import { itemAt } from "@/engine/core/common/item_at";

/**
 * Deals a fixed number of cards face up to each column, round-robin, then one
 * to each cell.
 */
export function dealColumnsThenCells(
  deal: Deal,
  tableaus: readonly ReadonlyCardPile<PlayingCard>[],
  cells: readonly ReadonlyCardPile<PlayingCard>[],
  cardsPerColumn: number,
): void {
  if (tableaus.length === 0) return;

  const toColumns = Math.min(deal.remaining, tableaus.length * cardsPerColumn);
  for (let dealt = 0; dealt < toColumns; dealt++) {
    deal.dealTo(itemAt(tableaus, dealt % tableaus.length), true);
  }

  // One card per cell: dealing straight into a pile bypasses the zone's
  // capacity.
  deal.dealEach(cells, true);
}

/**
 * Deals one card face up from the stock onto each of the given columns, and
 * returns a transfer per card for the caller to record as one action.
 *
 * Whether the stock may deal at all is for each game to decide.
 */
export function dealRowFromStock(
  tabletop: Tabletop,
  stock: ReadonlyCardPile<PlayingCard>,
  columns: readonly ReadonlyCardPile<PlayingCard>[],
): CardTransfer[] {
  const transfers: CardTransfer[] = [];
  for (const column of columns) {
    const card = stock.topCard;
    // A stock with fewer cards than columns deals as far as it reaches, which
    // is the last deal of a game whose stock does not divide evenly.
    if (!card) break;
    transfers.push(tabletop.relocate([card], column, { faceUp: true }));
  }
  return transfers;
}

/**
 * Deals one card face up from the stock onto each of `dealTo`, then sends any
 * run that completed to a foundation, and returns everything it moved and
 * turned over for the caller to commit as one action.
 *
 * @param columns Every column a completed run may sit in, which a deal onto
 *   only some of them, like Scorpion's, still has to scan.
 */
export function dealRowCollectingRuns(
  tabletop: Tabletop,
  stock: ReadonlyCardPile<PlayingCard>,
  dealTo: readonly ReadonlyCardPile<PlayingCard>[],
  columns: readonly ReadonlyCardPile<PlayingCard>[],
  foundations: readonly ReadonlyCardPile<PlayingCard>[],
): { transfers: CardTransfer[]; flippedCardIds: string[] } {
  const dealt = dealRowFromStock(tabletop, stock, dealTo);
  // A dealt card can complete a run, and more than one column at a time.
  const collected = collectCompletedRuns(tabletop, columns, foundations);
  return {
    transfers: [...dealt, ...collected.transfers],
    flippedCardIds: collected.flippedCardIds,
  };
}
