import { IntentHandler } from "@/engine/render/input/table_intents";
import { drawOnStockTop, tableGestures } from "@/games/common/table_gestures";
import { DoubleKlondikeGame } from "./double_klondike_game";
import { DoubleKlondikeRole } from "./double_klondike_zones";

/**
 * What a press or a drop means in Double Klondike.
 *
 * Klondike's gesture map exactly, because the stock behaves the same way from
 * the player's side: pressing the top of the stock draws three, pressing the
 * empty stock recycles the waste, and double-pressing a card in a column or on
 * the waste sends it wherever it will go.
 *
 * @param game The game to act on.
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
