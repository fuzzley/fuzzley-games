import { PileRole } from "@/engine/core/card/card_pile";
import { CardPressHandler, MovableGame } from "./table_gestures";

/**
 * Returns a press handler that calls `draw` when the stock's top card is
 * pressed, and throws for a card in no pile.
 */
export function drawOnStockTop(
  stockRole: PileRole,
  draw: () => void,
): CardPressHandler {
  return (cardId, pile) => {
    if (!pile) {
      throw new Error(`Card ${cardId} is not in a pile`);
    }
    if (pile.role === stockRole && pile.topCard?.id === cardId) {
      draw();
    }
  };
}

/** Returns a press handler that calls `deal` when any stock card is pressed. */
export function dealOnStockPress(
  stockRole: PileRole,
  deal: () => void,
): CardPressHandler {
  return (_cardId, pile) => {
    if (pile?.role === stockRole) {
      deal();
    }
  };
}

/**
 * Returns a press handler that plays a card from a pile of one of `roles` to
 * its best destination, as Golf plays a card by a single press.
 *
 * Pair it with an empty `autoMoveFrom`, so the second press of a double press
 * does nothing more: it lands on the card already on its way.
 */
export function playOnPress(
  game: MovableGame,
  roles: readonly PileRole[],
): CardPressHandler {
  return (cardId, pile) => {
    if (pile && roles.includes(pile.role)) {
      game.autoMoveCard(cardId);
    }
  };
}
