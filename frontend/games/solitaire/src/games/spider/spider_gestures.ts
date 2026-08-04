import { IntentHandler } from "@/engine/render/input/table_intents";
import { dealOnStockPress, tableGestures } from "@/games/common/table_gestures";
import { SpiderGame } from "./spider_game";
import { SpiderRole } from "./spider_zones";

/**
 * What a press or a drop means in Spider.
 *
 * Pressing the stock deals a row — to every column at once, not to a waste.
 * Double-pressing a card in a column sends it wherever it will go. The stock's
 * empty slot is not pressable: by the time it is empty there is nothing left to
 * deal.
 */
export function spiderGestures(game: SpiderGame): IntentHandler {
  return tableGestures(game, {
    onCardPress: dealOnStockPress(SpiderRole.STOCK, () => game.dealRow()),
    autoMoveFrom: [SpiderRole.TABLEAU],
  });
}
