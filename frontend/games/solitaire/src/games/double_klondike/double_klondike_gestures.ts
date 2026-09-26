import { IntentHandler } from "@/engine/render/input/table_intents";
import { drawOnStockTop, tableGestures } from "@/games/common/table_gestures";
import { DoubleKlondikeGame } from "./double_klondike_game";
import { DoubleKlondikeRole } from "./double_klondike_zones";

/**
 * Returns what a press or a drop means in Double Klondike, which is what it
 * means in Klondike.
 */
export function doubleKlondikeGestures(
  game: DoubleKlondikeGame,
): IntentHandler {
  return tableGestures(game, {
    onCardPress: drawOnStockTop(DoubleKlondikeRole.STOCK, () =>
      game.drawCardsFromStock(),
    ),
    onPilePress: (pileId) => {
      if (pileId === game.stock.id && game.stock.isEmpty) {
        game.drawCardsFromStock();
      }
    },
    autoMoveFrom: [DoubleKlondikeRole.TABLEAU, DoubleKlondikeRole.WASTE],
  });
}
