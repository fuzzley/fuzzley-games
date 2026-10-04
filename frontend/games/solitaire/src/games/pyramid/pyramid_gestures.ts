import { IntentHandler } from "@/engine/render/input/table_intents";
import { drawOnStockTop, tableGestures } from "@/engine/tableau/table_gestures";
import { PyramidGame } from "./pyramid_game";
import { PyramidRole } from "./pyramid_zones";

/**
 * Returns what a press or a drop means in Pyramid, where pressing the stock
 * turns a card and pressing the empty stock turns the waste back over.
 */
export function pyramidGestures(game: PyramidGame): IntentHandler {
  return tableGestures(game, {
    onCardPress: drawOnStockTop(PyramidRole.STOCK, () =>
      game.drawCardsFromStock(),
    ),
    onPilePress: (pileId) => {
      if (pileId === game.stock.id && game.stock.isEmpty) {
        game.drawCardsFromStock();
      }
    },
    autoMoveFrom: [PyramidRole.PYRAMID, PyramidRole.HAND, PyramidRole.WASTE],
  });
}
