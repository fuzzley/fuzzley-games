import { IntentHandler } from "@/engine/render/input/table_intents";
import { drawOnStockTop } from "@/engine/tableau/gestures/press_handlers";
import { tableGestures } from "@/engine/tableau/gestures/table_gestures";
import { KlondikeRole } from "./klondike_zones";
import { KlondikeFamilyGame } from "./klondike_family_game";

/**
 * Returns what a press or a drop means in a game of the Klondike family, where
 * pressing the stock draws and pressing the empty stock recycles the waste.
 */
export function klondikeGestures(game: KlondikeFamilyGame): IntentHandler {
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
