import { IntentHandler } from "@/engine/render/input/table_intents";
import { ScorpionGame } from "./scorpion_game";
import { ScorpionRole } from "./scorpion_zones";

/**
 * What a press or a drop means in Scorpion.
 *
 * Pressing the stock deals its three cards out — all of them, once, with no
 * waste to turn them into. Double-pressing a column card sends it wherever it
 * will go, and a drop is a move.
 *
 * Scorpion cannot take the shared stockless gesture map, because it has a stock;
 * it cannot share Spider's either, because the two answer a press on it
 * differently.
 */
export function scorpionGestures(game: ScorpionGame): IntentHandler {
  return (intent) => {
    switch (intent.kind) {
      case "activate": {
        const pile = game.getPileContainingCard(intent.cardId);
        if (pile?.role === ScorpionRole.STOCK) {
          game.dealStock();
        }
        return;
      }

      case "activate-pile":
        // The stock's slot is only pressable once it is empty, and an empty
        // Scorpion stock stays empty.
        return;

      case "activate-secondary": {
        const pile = game.getPileContainingCard(intent.cardId);
        if (pile?.role === ScorpionRole.TABLEAU) {
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
