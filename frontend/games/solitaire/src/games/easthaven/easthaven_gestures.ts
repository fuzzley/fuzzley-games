import { IntentHandler } from "@/engine/render/input/table_intents";
import {
  dealOnStockPress,
  tableGestures,
} from "@/engine/tableau/table_gestures";
import { EasthavenGame } from "./easthaven_game";
import { EasthavenRole } from "./easthaven_zones";

/**
 * Returns what a press or a drop means in Easthaven, where pressing the stock
 * deals a row.
 *
 * A double press on a foundation card does nothing, since it could only go
 * back to a column.
 */
export function easthavenGestures(game: EasthavenGame): IntentHandler {
  return tableGestures(game, {
    onCardPress: dealOnStockPress(EasthavenRole.STOCK, () => game.dealRow()),
    autoMoveFrom: [EasthavenRole.TABLEAU],
  });
}
