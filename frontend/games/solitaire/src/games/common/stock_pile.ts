import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { CardTransfer } from "@/engine/tableau/move";

/**
 * The two things a stock-and-waste game does with its stock.
 *
 * Klondike, Forty Thieves and Double Klondike all turn cards from a face-down
 * stock onto a face-up waste, and two of the three turn the waste back over when
 * the stock runs out. The mechanics are identical in all of them — including the
 * two order reversals below, which are the easy part to get wrong — so they are
 * written once here rather than transcribed per game.
 *
 * Deliberately unaware of scoring, move counts and history. A stock that emptied
 * itself into the undo stack would be making decisions that belong to the game:
 * Klondike charges a penalty for a recycle and Forty Thieves has no recycle at
 * all. These functions move cards and report what they moved; the caller records
 * it.
 */

/**
 * Turns up to `count` cards from the stock onto the waste, face up.
 *
 * @param stock The face-down pile to draw from.
 * @param waste The face-up pile to draw onto.
 * @param count How many cards a draw turns over. More than the stock holds
 *   simply draws the stock out.
 * @returns The single transfer this moved, or nothing when the stock was empty.
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
      // Reversed: the cards came off the top of the stock, so the order they
      // were drawn in is the opposite of the order they sat in. A transfer
      // records where cards came *from*, which is what lets undo re-append them
      // and get the original pile back.
      cardIds: drawn.reverse().map((card) => card.id),
      fromPileId: stock.id,
      toPileId: waste.id,
      faceUpBefore: false,
    },
  ];
}

/**
 * Turns the whole waste back onto the stock, face down.
 *
 * @param waste The face-up pile to empty.
 * @param stock The face-down pile to refill.
 * @returns The single transfer this moved, or nothing when the waste was empty.
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
