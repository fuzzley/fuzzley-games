import { IntentHandler } from "@/engine/render/input/table_intents";

/** The two things a gesture can ask a game to do. */
export interface MovableGame {
  /** Moves a card and its stacked cards to a destination pile. */
  moveCardToPile(cardId: string, targetPileId: string): boolean;
  /** Sends a card to its best available destination. */
  autoMoveCard(cardId: string): boolean;
}

/**
 * What a press or a drop means in a game with no stock.
 *
 * There is nothing to draw and nothing to recycle, so a single press does
 * nothing at all and no empty slot is worth clicking. A double press sends a
 * card wherever it will go, and a drop is a move.
 *
 * Shared by FreeCell, Baker's Game, Eight Off and the Yukon family — every game
 * whose whole board is dealt at the start. Klondike, Spider and Scorpion each
 * have a stock and write their own.
 *
 * @param game The game to act on.
 */
export function stocklessGestures(game: MovableGame): IntentHandler {
  return (intent) => {
    switch (intent.kind) {
      case "activate":
      case "activate-pile":
        // Nothing here responds to a single press.
        return;

      case "activate-secondary":
        game.autoMoveCard(intent.cardId);
        return;

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
