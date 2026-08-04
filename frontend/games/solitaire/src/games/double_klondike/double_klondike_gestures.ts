import { IntentHandler } from "@/engine/render/input/table_intents";
import { DoubleKlondikeGame } from "./double_klondike_game";
import { DoubleKlondikeRole } from "./double_klondike_zones";

/**
 * What a press or a drop means in Double Klondike.
 *
 * Klondike's gesture map exactly, because the stock behaves the same way from
 * the player's side: pressing the top of the stock draws three, pressing the
 * empty stock recycles the waste, and double-pressing a card in a column or on
 * the waste sends it wherever it will go.
 *
 * @param game The game to act on.
 */
export function doubleKlondikeGestures(
  game: DoubleKlondikeGame,
): IntentHandler {
  return (intent) => {
    switch (intent.kind) {
      case "activate": {
        const pile = game.getPileContainingCard(intent.cardId);
        // Every card in play is in some pile. A press on one that is not means
        // the board and its sprites have drifted apart, which should fail
        // loudly rather than quietly do nothing.
        if (!pile) {
          throw new Error(`Card ${intent.cardId} is not in a pile`);
        }
        if (
          pile.role === DoubleKlondikeRole.STOCK &&
          pile.topCard?.id === intent.cardId
        ) {
          game.drawCardsFromStock();
        }
        return;
      }

      case "activate-secondary": {
        const pile = game.getPileContainingCard(intent.cardId);
        if (
          pile?.role === DoubleKlondikeRole.TABLEAU ||
          pile?.role === DoubleKlondikeRole.WASTE
        ) {
          game.autoMoveCard(intent.cardId);
        }
        return;
      }

      case "activate-pile": {
        if (intent.pileId === game.stock.id && game.stock.isEmpty) {
          game.drawCardsFromStock();
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
