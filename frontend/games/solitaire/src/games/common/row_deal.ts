import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { CardTransfer } from "@/engine/tableau/move";
import { collectCompletedRuns } from "./completed_runs";

/**
 * Deals a fixed number of cards face up to each column, round-robin, then one
 * to each cell.
 *
 * @param deck The cards to deal, which this drains.
 */
export function dealColumnsThenCells(
  deck: PlayingCard[],
  tableaus: readonly CardPile<PlayingCard>[],
  cells: readonly CardPile<PlayingCard>[],
  cardsPerColumn: number,
): void {
  if (tableaus.length === 0) return;

  const toColumns = Math.min(deck.length, tableaus.length * cardsPerColumn);
  for (let dealt = 0; dealt < toColumns; dealt++) {
    const card = deck.pop();
    if (!card) break;
    card.faceUp = true;
    tableaus[dealt % tableaus.length].addCard(card);
  }

  // One card per cell: dealing straight into a pile bypasses the zone's
  // capacity.
  for (const cell of cells) {
    const card = deck.pop();
    if (!card) break;
    card.faceUp = true;
    cell.addCard(card);
  }
}

/**
 * Deals one card face up from the stock onto each of the given columns, and
 * returns a transfer per card for the caller to record as one action.
 *
 * Whether the stock may deal at all is for each game to decide.
 */
export function dealRowFromStock(
  stock: CardPile<PlayingCard>,
  columns: readonly CardPile<PlayingCard>[],
): CardTransfer[] {
  const transfers: CardTransfer[] = [];
  for (const column of columns) {
    const card = stock.topCard;
    // A stock with fewer cards than columns deals as far as it reaches, which
    // is the last deal of a game whose stock does not divide evenly.
    if (!card) break;
    stock.removeCard(card);
    card.faceUp = true;
    column.addCard(card);
    transfers.push({
      cardIds: [card.id],
      fromPileId: stock.id,
      toPileId: column.id,
      faceUpBefore: false,
    });
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
  stock: CardPile<PlayingCard>,
  dealTo: readonly CardPile<PlayingCard>[],
  columns: readonly CardPile<PlayingCard>[],
  foundations: readonly CardPile<PlayingCard>[],
): { transfers: CardTransfer[]; flippedCardIds: string[] } {
  const dealt = dealRowFromStock(stock, dealTo);
  // A dealt card can complete a run, and more than one column at a time.
  const collected = collectCompletedRuns(columns, foundations);
  return {
    transfers: [...dealt, ...collected.transfers],
    flippedCardIds: collected.flippedCardIds,
  };
}
