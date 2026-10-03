import { IntentHandler } from "@/engine/render/input/table_intents";
import { tableGestures } from "@/games/common/table_gestures";
import { GolfGame } from "./golf_game";
import { GolfRole } from "./golf_zones";

/**
 * Returns what a press or a drop means in Golf, where pressing the stock turns
 * a card and pressing a column's top card plays it.
 *
 * A single press plays, as in PySol, so a double press means nothing more: its
 * second press lands on the card already on its way to the foundation.
 */
export function golfGestures(game: GolfGame): IntentHandler {
  return tableGestures(game, {
    onCardPress: (cardId, pile) => {
      if (pile?.role === GolfRole.STOCK) {
        game.drawCard();
      } else if (pile?.role === GolfRole.TABLEAU) {
        game.autoMoveCard(cardId);
      }
    },
    autoMoveFrom: [],
  });
}
