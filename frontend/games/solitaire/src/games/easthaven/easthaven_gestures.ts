import { IntentHandler } from "@/engine/render/input/table_intents";
import { EasthavenGame } from "./easthaven_game";
import { EasthavenRole } from "./easthaven_zones";

/**
 * What a press or a drop means in Easthaven.
 *
 * Pressing the stock deals a row to every column at once. Double-pressing a card
 * in a column sends it to a foundation if it will go.
 *
 * A double press on a foundation card is ignored, as it is in Klondike: the only
 * place such a card could go is back onto a column, and sending it there
 * automatically would undo the player's own progress.
 */
export function easthavenGestures(game: EasthavenGame): IntentHandler {
  return (intent) => {
    switch (intent.kind) {
      case "activate": {
        const pile = game.getPileContainingCard(intent.cardId);
        if (pile?.role === EasthavenRole.STOCK) {
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
        if (pile?.role === EasthavenRole.TABLEAU) {
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
