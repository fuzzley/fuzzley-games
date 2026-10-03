import { CardPile, PileRole } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { IntentHandler } from "@/engine/render/input/table_intents";

/** Exposes the two moves a gesture can ask any game to make. */
export interface MovableGame {
  /** Moves a card and its stacked cards to a destination pile. */
  moveCardToPile(cardId: string, targetPileId: string): boolean;
  /** Sends a card to its best available destination. */
  autoMoveCard(cardId: string): boolean;
}

/** Extends a {@link MovableGame} with a way to ask where a card is. */
export interface GestureGame extends MovableGame {
  /** Returns the pile holding the given card, or undefined. */
  getPileContainingCard(cardId: string): CardPile<PlayingCard> | undefined;
}

/** Says what a game does with the presses only it understands. */
export interface TableGestureOptions {
  /** Handles a single press on a card, such as a Klondike draw. */
  readonly onCardPress?: (
    cardId: string,
    pile: CardPile<PlayingCard> | undefined,
  ) => void;

  /** Handles a press on an empty pile slot, such as Klondike's recycle. */
  readonly onPilePress?: (pileId: string) => void;

  /**
   * The roles a double press will send a card from, or undefined for every
   * role.
   */
  readonly autoMoveFrom?: readonly PileRole[];
}

/**
 * Returns an intent handler that moves cards on a drop or a double press, and
 * leaves single presses to `options`.
 */
export function tableGestures(
  game: GestureGame,
  options: TableGestureOptions = {},
): IntentHandler {
  const { onCardPress, onPilePress, autoMoveFrom } = options;

  return (intent) => {
    switch (intent.kind) {
      case "activate":
        onCardPress?.(intent.cardId, game.getPileContainingCard(intent.cardId));
        return;

      case "activate-pile":
        onPilePress?.(intent.pileId);
        return;

      case "activate-secondary": {
        const pile = game.getPileContainingCard(intent.cardId);
        if (!autoMoveFrom || (pile && autoMoveFrom.includes(pile.role))) {
          game.autoMoveCard(intent.cardId);
        }
        return;
      }

      case "drop": {
        const [primaryCardId] = intent.cardIds;
        if (intent.targetPileId && primaryCardId) {
          game.moveCardToPile(primaryCardId, intent.targetPileId);
        }
        return;
      }
    }
  };
}

/**
 * Returns a press handler that calls `draw` when the stock's top card is
 * pressed, and throws for a card in no pile.
 */
export function drawOnStockTop(
  stockRole: PileRole,
  draw: () => void,
): NonNullable<TableGestureOptions["onCardPress"]> {
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
): NonNullable<TableGestureOptions["onCardPress"]> {
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
): NonNullable<TableGestureOptions["onCardPress"]> {
  return (cardId, pile) => {
    if (pile && roles.includes(pile.role)) {
      game.autoMoveCard(cardId);
    }
  };
}

/**
 * Returns the intent handler for a game with no stock, where a single press
 * does nothing.
 */
export function stocklessGestures(game: GestureGame): IntentHandler {
  return tableGestures(game);
}
