import { IntentHandler } from "@/engine/render/input/table_intents";
import { dealOnStockPress, tableGestures } from "@/games/common/table_gestures";
import { EasthavenGame } from "./easthaven_game";
import { EasthavenRole } from "./easthaven_zones";

/**
 * What a press or a drop means in Easthaven.
 *
 * Pressing the stock deals a row to every column at once. Double-pressing a card
 * in a column sends it to a foundation if it will go.
 *
 * A double press on a foundation card is ignored, as it is in Klondike: the only
 * place such a card could go is back onto a column, and sending it there
 * automatically would undo the player's own progress.
 */
export function easthavenGestures(game: EasthavenGame): IntentHandler {
  return tableGestures(game, {
    onCardPress: dealOnStockPress(EasthavenRole.STOCK, () => game.dealRow()),
    autoMoveFrom: [EasthavenRole.TABLEAU],
  });
}
