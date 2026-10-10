import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { CardTransfer } from "@/engine/tableau/moves/move";
import { Tabletop } from "@/engine/tableau/tabletop";

/**
 * Draws from a stock onto a waste and recycles the waste back, leaving the
 * caller to score and record what moved.
 */

/**
 * Turns up to `count` cards from the stock onto the waste, face up, and returns
 * the transfer it made, if any.
 */
export function drawToWaste(
  tabletop: Tabletop,
  stock: ReadonlyCardPile<PlayingCard>,
  waste: ReadonlyCardPile<PlayingCard>,
  count: number,
): CardTransfer[] {
  // Top first, the order they are turned over in.
  const drawn = stock.getCards().slice(-count).reverse();
  if (count <= 0 || drawn.length === 0) return [];
  return [tabletop.relocate(drawn, waste, { faceUp: true })];
}

/**
 * Turns the whole waste back onto the stock, face down, and returns the
 * transfer it made, if any.
 */
export function recycleWasteToStock(
  tabletop: Tabletop,
  waste: ReadonlyCardPile<PlayingCard>,
  stock: ReadonlyCardPile<PlayingCard>,
): CardTransfer[] {
  // Top first, so the card turned first comes round first again.
  const recycled = [...waste.getCards()].reverse();
  if (recycled.length === 0) return [];
  return [tabletop.relocate(recycled, stock, { faceUp: false })];
}
