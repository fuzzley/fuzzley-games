import { IntentHandler } from "@/engine/render/input/table_intents";
import { playOnPress } from "@/engine/tableau/gestures/press_handlers";
import { tableGestures } from "@/engine/tableau/gestures/table_gestures";
import { GolfGame } from "./golf_game";
import { GolfRole } from "./golf_zones";

/**
 * Returns what a press or a drop means in Golf, where pressing the stock turns
 * a card and pressing a column's top card plays it.
 *
 * A single press plays, as in PySol.
 */
export function golfGestures(game: GolfGame): IntentHandler {
  const play = playOnPress(game, [GolfRole.TABLEAU]);
  return tableGestures(game, {
    onCardPress: (cardId, pile) => {
      if (pile?.role === GolfRole.STOCK) {
        game.drawCard();
      } else {
        play(cardId, pile);
      }
    },
    autoMoveFrom: [],
  });
}
