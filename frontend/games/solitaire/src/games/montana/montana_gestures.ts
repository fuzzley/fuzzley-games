import { IntentHandler } from "@/engine/render/input/table_intents";
import { tableGestures } from "@/games/common/table_gestures";
import { MontanaGame } from "./montana_game";
import { REDEAL_PILE_ID } from "./montana_zones";

/**
 * What a press or a drop means in Montana.
 *
 * Pressing the redeal marker gathers and reshuffles. Double-pressing a card
 * sends it to the gap that wants it, of which there is at most one — a card
 * follows exactly one other card, so there is no choice for the game to make on
 * the player's behalf. The exception is a Two, which any empty first column will
 * take; the leftmost such gap wins, and the player can always drag instead.
 *
 * A single press on a card does nothing. There is no stock to draw and no
 * meaning to give it.
 */
export function montanaGestures(game: MontanaGame): IntentHandler {
  return tableGestures(game, {
    onPilePress: (pileId) => {
      if (pileId === REDEAL_PILE_ID) {
        game.redeal();
      }
    },
  });
}
