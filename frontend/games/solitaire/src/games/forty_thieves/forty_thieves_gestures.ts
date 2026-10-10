import { IntentHandler } from "@/engine/render/input/table_intents";
import { drawOnStockTop } from "@/engine/tableau/gestures/press_handlers";
import { tableGestures } from "@/engine/tableau/gestures/table_gestures";
import { FortyThievesGame } from "./forty_thieves_game";
import { FortyThievesRole } from "./forty_thieves_zones";

/**
 * Returns what a press or a drop means in Forty Thieves, where pressing the
 * stock draws one card and the empty stock does nothing.
 */
export function fortyThievesGestures(game: FortyThievesGame): IntentHandler {
  return tableGestures(game, {
    onCardPress: drawOnStockTop(FortyThievesRole.STOCK, () => game.drawCard()),
    autoMoveFrom: [FortyThievesRole.TABLEAU, FortyThievesRole.WASTE],
  });
}
