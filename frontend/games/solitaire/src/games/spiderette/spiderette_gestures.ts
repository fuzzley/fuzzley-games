import { IntentHandler } from "@/engine/render/input/table_intents";
import { dealOnStockPress } from "@/engine/tableau/gestures/press_handlers";
import { tableGestures } from "@/engine/tableau/gestures/table_gestures";
import { SpideretteGame } from "./spiderette_game";
import { SpideretteRole } from "./spiderette_zones";

/**
 * Returns what a press or a drop means in Spiderette, where pressing the stock
 * deals a row.
 */
export function spideretteGestures(game: SpideretteGame): IntentHandler {
  return tableGestures(game, {
    onCardPress: dealOnStockPress(SpideretteRole.STOCK, () => game.dealRow()),
    autoMoveFrom: [SpideretteRole.TABLEAU],
  });
}
