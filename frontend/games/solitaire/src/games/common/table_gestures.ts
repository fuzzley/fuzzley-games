import { CardPile, PileRole } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { IntentHandler } from "@/engine/render/input/table_intents";

/** The two things a gesture can ask any game to do. */
export interface MovableGame {
  /** Moves a card and its stacked cards to a destination pile. */
  moveCardToPile(cardId: string, targetPileId: string): boolean;
  /** Sends a card to its best available destination. */
  autoMoveCard(cardId: string): boolean;
}

/** A game a gesture map can also ask where a card is. */
export interface GestureGame extends MovableGame {
  /** The pile holding the given card, or undefined. */
  getPileContainingCard(cardId: string): CardPile<PlayingCard> | undefined;
}

/** What a game does with the presses only it understands. */
export interface TableGestureOptions {
  /**
   * A single press on a card — a Klondike draw, a Spider row.
   *
   * Told the pile holding the card, which may be undefined when the board and
   * its sprites have drifted apart. Most games ignore that case; Klondike
   * treats it as something that should fail loudly.
   */
  readonly onCardPress?: (
    cardId: string,
    pile: CardPile<PlayingCard> | undefined,
  ) => void;

  /** A single press on an empty pile slot — Klondike's recycle, Montana's redeal. */
  readonly onPilePress?: (pileId: string) => void;

  /**
   * The roles a double press will send a card from. Omit for any role at all,
   * which is what a game with no stock wants: everything on its board is in
   * play.
   */
  readonly autoMoveFrom?: readonly PileRole[];
}

/**
 * What a press or a drop means, for any game.
 *
 * Nine games wrote out their own four-case switch, and the `drop` case was
 * byte-identical in every one of them — Spider's map and Spiderette's, and
 * Klondike's and Double Klondike's, were identical throughout but for the
 * identifiers. What actually differs is what a press on the stock does and
 * which piles answer a double press, so those are the parameters and the rest
 * is written once.
 *
 * Everything else about handling a pointer — hover, the double press window,
 * the stack in hand, the flight afterwards — is the engine's, and is the same
 * in every game.
 *
 * @param game The game to act on.
 * @param options What this game does with a press.
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
 * A press handler for a stock whose top card is the one that draws.
 *
 * Klondike, Double Klondike and Forty Thieves. Pressing a card buried in the
 * stock does nothing, and pressing anything else is handled on the second
 * press.
 *
 * A card in no pile means the board and its sprites have drifted apart, which
 * fails loudly rather than quietly doing nothing.
 *
 * @param stockRole The role of the pile that draws.
 * @param draw What a press on it does.
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

/**
 * A press handler for a stock that deals wherever it is pressed.
 *
 * Spider, Spiderette, Scorpion and Easthaven, whose stocks deal a row rather
 * than turning a card into a waste — so which card was pressed does not matter,
 * only that it was the stock.
 *
 * @param stockRole The role of the pile that deals.
 * @param deal What a press on it does.
 */
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
 * What a press or a drop means in a game with no stock.
 *
 * There is nothing to draw and nothing to recycle, so a single press does
 * nothing at all and no empty slot is worth clicking. A double press sends a
 * card wherever it will go, and a drop is a move.
 *
 * Shared by FreeCell, Baker's Game, Eight Off and the Yukon family — every game
 * whose whole board is dealt at the start.
 *
 * @param game The game to act on.
 */
export function stocklessGestures(game: GestureGame): IntentHandler {
  return tableGestures(game);
}
