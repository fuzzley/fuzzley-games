import { IntentHandler } from "@/engine/render/input/table_intents";
import { SpiderGame } from "./spider_game";
import { SpiderRole } from "./spider_zones";

/**
 * What a press or a drop means in Spider.
 *
 * Pressing the stock deals a row — to every column at once, not to a waste.
 * Double-pressing a card sends it wherever it will go.
 */
export function spiderGestures(game: SpiderGame): IntentHandler {
  return (intent) => {
    switch (intent.kind) {
      case "activate": {
        const pile = game.getPileContainingCard(intent.cardId);
        if (pile?.role === SpiderRole.STOCK) {
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
        if (pile?.role === SpiderRole.TABLEAU) {
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
