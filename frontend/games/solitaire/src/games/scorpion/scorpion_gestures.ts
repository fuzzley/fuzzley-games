import { IntentHandler } from "@/engine/render/input/table_intents";
import { dealOnStockPress, tableGestures } from "@/games/common/table_gestures";
import { ScorpionGame } from "./scorpion_game";
import { ScorpionRole } from "./scorpion_zones";

/**
 * What a press or a drop means in Scorpion.
 *
 * Pressing the stock deals its three cards out — all of them, once, with no
 * waste to turn them into. Double-pressing a column card sends it wherever it
 * will go, and a drop is a move.
 *
 * The stock's empty slot is not pressable, and an empty Scorpion stock stays
 * empty.
 */
export function scorpionGestures(game: ScorpionGame): IntentHandler {
  return tableGestures(game, {
    onCardPress: dealOnStockPress(ScorpionRole.STOCK, () => game.dealStock()),
    autoMoveFrom: [ScorpionRole.TABLEAU],
  });
}
