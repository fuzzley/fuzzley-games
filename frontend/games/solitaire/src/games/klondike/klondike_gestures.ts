import { IntentHandler } from "@/engine/render/input/table_intents";
import { drawOnStockTop, tableGestures } from "@/games/common/table_gestures";
import { KlondikeRole } from "./klondike_zones";
import { KlondikeGame } from "./klondike_game";

/**
 * Returns what a press or a drop means in Klondike, where pressing the stock
 * draws and pressing the empty stock recycles the waste.
 */
export function klondikeGestures(game: KlondikeGame): IntentHandler {
  return tableGestures(game, {
    onCardPress: drawOnStockTop(KlondikeRole.STOCK, () =>
      game.drawCardsFromStock(),
    ),
    onPilePress: (pileId) => {
      if (pileId === game.stock.id && game.stock.isEmpty) {
        game.drawCardsFromStock();
      }
    },
    autoMoveFrom: [KlondikeRole.TABLEAU, KlondikeRole.WASTE],
  });
}
