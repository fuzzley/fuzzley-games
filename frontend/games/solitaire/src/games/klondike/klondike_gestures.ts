import { IntentHandler } from "@/engine/render/input/table_intents";
import { drawOnStockTop, tableGestures } from "@/games/common/table_gestures";
import { KlondikeRole } from "./klondike_zones";
import { KlondikeGame } from "./klondike_game";

/**
 * What a press or a drop means in Klondike.
 *
 * Pressing the top of the stock draws. Pressing the empty stock recycles the
 * waste. Double-pressing a card in the tableau or the waste sends it wherever
 * it will go. Everything else about handling a pointer — hover, the double
 * press window, the stack in hand, the flight afterwards — is the engine's, and
 * is the same in every game.
 *
 * @param game The game to act on.
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
