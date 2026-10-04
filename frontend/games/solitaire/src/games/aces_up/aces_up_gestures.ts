import { IntentHandler } from "@/engine/render/input/table_intents";
import {
  dealOnStockPress,
  tableGestures,
} from "@/engine/tableau/table_gestures";
import { AcesUpGame } from "./aces_up_game";
import { AcesUpRole } from "./aces_up_zones";

/**
 * Returns what a press or a drop means in Aces Up, where pressing the stock
 * deals a card onto every column and a double press discards a card.
 */
export function acesUpGestures(game: AcesUpGame): IntentHandler {
  return tableGestures(game, {
    onCardPress: dealOnStockPress(AcesUpRole.STOCK, () => game.deal()),
    autoMoveFrom: [AcesUpRole.TABLEAU],
  });
}
