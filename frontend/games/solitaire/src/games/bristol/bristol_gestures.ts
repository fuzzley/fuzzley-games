import { IntentHandler } from "@/engine/render/input/table_intents";
import { dealOnStockPress } from "@/engine/tableau/gestures/press_handlers";
import { tableGestures } from "@/engine/tableau/gestures/table_gestures";
import { BristolGame } from "./bristol_game";
import { BristolRole } from "./bristol_zones";

/**
 * Returns what a press or a drop means in Bristol, where pressing the stock
 * deals a card onto each reserve.
 */
export function bristolGestures(game: BristolGame): IntentHandler {
  return tableGestures(game, {
    onCardPress: dealOnStockPress(BristolRole.STOCK, () => game.deal()),
    autoMoveFrom: [BristolRole.TABLEAU, BristolRole.RESERVE],
  });
}
