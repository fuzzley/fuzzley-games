import { IntentHandler } from "@/engine/render/input/table_intents";
import { drawOnStockTop, tableGestures } from "@/games/common/table_gestures";
import { FortyThievesGame } from "./forty_thieves_game";
import { FortyThievesRole } from "./forty_thieves_zones";

/**
 * What a press or a drop means in Forty Thieves.
 *
 * Pressing the top of the stock draws one card. Double-pressing a card in a
 * column or on the waste sends it to a foundation if it will go.
 *
 * Klondike's gesture map minus its recycle: no press on the empty stock does
 * anything here, and the zone accordingly does not mark its empty slot
 * actionable. A press that silently did nothing would be worse than no press at
 * all — it would suggest the stock might come back.
 */
export function fortyThievesGestures(game: FortyThievesGame): IntentHandler {
  return tableGestures(game, {
    onCardPress: drawOnStockTop(FortyThievesRole.STOCK, () => game.drawCard()),
    autoMoveFrom: [FortyThievesRole.TABLEAU, FortyThievesRole.WASTE],
  });
}
