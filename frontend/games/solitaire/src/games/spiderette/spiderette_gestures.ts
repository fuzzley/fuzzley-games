import { IntentHandler } from "@/engine/render/input/table_intents";
import { dealOnStockPress, tableGestures } from "@/games/common/table_gestures";
import { SpideretteGame } from "./spiderette_game";
import { SpideretteRole } from "./spiderette_zones";

/**
 * What a press or a drop means in Spiderette.
 *
 * Spider's gesture map exactly, because the stock behaves the same way from the
 * player's side; where the two games differ is in when the stock is willing,
 * which the game decides rather than the gesture.
 */
export function spideretteGestures(game: SpideretteGame): IntentHandler {
  return tableGestures(game, {
    onCardPress: dealOnStockPress(SpideretteRole.STOCK, () => game.dealRow()),
    autoMoveFrom: [SpideretteRole.TABLEAU],
  });
}
