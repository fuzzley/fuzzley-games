import { IntentHandler } from "@/engine/render/input/table_intents";
import { dealOnStockPress } from "@/engine/tableau/gestures/press_handlers";
import { tableGestures } from "@/engine/tableau/gestures/table_gestures";
import { ScorpionGame } from "./scorpion_game";
import { ScorpionRole } from "./scorpion_zones";

/**
 * Returns what a press or a drop means in Scorpion, where pressing the stock
 * deals all three of its cards.
 */
export function scorpionGestures(game: ScorpionGame): IntentHandler {
  return tableGestures(game, {
    onCardPress: dealOnStockPress(ScorpionRole.STOCK, () => game.dealStock()),
    autoMoveFrom: [ScorpionRole.TABLEAU],
  });
}
