import { IntentHandler } from "@/engine/render/input/table_intents";
import { SpideretteGame } from "./spiderette_game";
import { SpideretteRole } from "./spiderette_zones";

/**
 * What a press or a drop means in Spiderette.
 *
 * Pressing the stock deals a row — to every column at once, not to a waste.
 * Double-pressing a card sends it wherever it will go. Spider's gesture map
 * exactly, because the stock behaves the same way from the player's side; where
 * the two games differ is in when the stock is willing, which the game decides
 * rather than the gesture.
 */
export function spideretteGestures(game: SpideretteGame): IntentHandler {
  return (intent) => {
    switch (intent.kind) {
      case "activate": {
        const pile = game.getPileContainingCard(intent.cardId);
        if (pile?.role === SpideretteRole.STOCK) {
          game.dealRow();
        }
        return;
      }

      case "activate-pile":
        // The stock's slot is only pressable once it is empty, at which point
        // there is nothing left to deal.
        return;

      case "activate-secondary": {
        const pile = game.getPileContainingCard(intent.cardId);
        if (pile?.role === SpideretteRole.TABLEAU) {
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
