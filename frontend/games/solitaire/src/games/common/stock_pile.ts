import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { CardTransfer } from "@/engine/tableau/move";

/**
 * Draws from a stock onto a waste and recycles the waste back, leaving the
 * caller to score and record what moved.
 */

/**
 * Turns up to `count` cards from the stock onto the waste, face up, and returns
 * the transfer it made, if any.
 */
export function drawToWaste(
  stock: CardPile<PlayingCard>,
  waste: CardPile<PlayingCard>,
  count: number,
): CardTransfer[] {
  const drawCount = Math.min(count, stock.size);
  const drawn: PlayingCard[] = [];
  for (let index = 0; index < drawCount; index++) {
    const topCard = stock.topCard;
    if (!topCard) break;
    stock.removeCard(topCard);
    topCard.faceUp = true;
    waste.addCard(topCard);
    drawn.push(topCard);
  }

  if (drawn.length === 0) return [];

  return [
    {
      // Reversed into the order they sat in the stock, which a transfer
      // records.
      cardIds: drawn.reverse().map((card) => card.id),
      fromPileId: stock.id,
      toPileId: waste.id,
      faceUpBefore: false,
    },
  ];
}

/**
 * Turns the whole waste back onto the stock, face down, and returns the
 * transfer it made, if any.
 */
export function recycleWasteToStock(
  waste: CardPile<PlayingCard>,
  stock: CardPile<PlayingCard>,
): CardTransfer[] {
  if (waste.isEmpty) return [];

  // Captured bottom-first before draining, which is the order undo restores.
  const recycled = [...waste.getCards()];
  let card = waste.topCard;
  while (card) {
    waste.removeCard(card);
    card.faceUp = false;
    stock.addCard(card);
    card = waste.topCard;
  }

  return [
    {
      cardIds: recycled.map((recycledCard) => recycledCard.id),
      fromPileId: waste.id,
      toPileId: stock.id,
      faceUpBefore: true,
    },
  ];
}
