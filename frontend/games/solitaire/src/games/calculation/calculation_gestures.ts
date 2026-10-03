import { IntentHandler } from "@/engine/render/input/table_intents";
import { drawOnStockTop, tableGestures } from "@/games/common/table_gestures";
import { CalculationGame } from "./calculation_game";
import { CalculationRole } from "./calculation_zones";

/**
 * Returns what a press or a drop means in Calculation, where pressing the stock
 * turns a card into the hand once the last one is placed.
 */
export function calculationGestures(game: CalculationGame): IntentHandler {
  return tableGestures(game, {
    onCardPress: drawOnStockTop(CalculationRole.STOCK, () => game.drawCard()),
    autoMoveFrom: [CalculationRole.HAND, CalculationRole.WASTE],
  });
}
