import { IntentHandler } from "@/engine/render/input/table_intents";
import { dealOnStockPress, tableGestures } from "@/games/common/table_gestures";
import { SpiderGame } from "./spider_game";
import { SpiderRole } from "./spider_zones";

/**
 * Returns what a press or a drop means in Spider, where pressing the stock
 * deals a row.
 */
export function spiderGestures(game: SpiderGame): IntentHandler {
  return tableGestures(game, {
    onCardPress: dealOnStockPress(SpiderRole.STOCK, () => game.dealRow()),
    autoMoveFrom: [SpiderRole.TABLEAU],
  });
}
