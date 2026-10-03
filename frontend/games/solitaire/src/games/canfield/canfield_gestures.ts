import { IntentHandler } from "@/engine/render/input/table_intents";
import { drawOnStockTop, tableGestures } from "@/games/common/table_gestures";
import { CanfieldGame } from "./canfield_game";
import { CanfieldRole } from "./canfield_zones";

/**
 * Returns what a press or a drop means in the Canfield family, where pressing
 * the stock draws and pressing the empty stock recycles the waste.
 */
export function canfieldGestures(game: CanfieldGame): IntentHandler {
  return tableGestures(game, {
    onCardPress: drawOnStockTop(CanfieldRole.STOCK, () =>
      game.drawCardsFromStock(),
    ),
    onPilePress: (pileId) => {
      if (pileId === game.stock.id && game.stock.isEmpty) {
        game.drawCardsFromStock();
      }
    },
    autoMoveFrom: [
      CanfieldRole.TABLEAU,
      CanfieldRole.WASTE,
      CanfieldRole.RESERVE,
    ],
  });
}
