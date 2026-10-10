import { IntentHandler } from "@/engine/render/input/table_intents";
import { tableGestures } from "@/engine/tableau/gestures/table_gestures";
import { MontanaGame } from "./montana_game";
import { REDEAL_PILE_ID } from "./montana_zones";

/**
 * Returns what a press or a drop means in Montana, where pressing the redeal
 * marker redeals.
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
