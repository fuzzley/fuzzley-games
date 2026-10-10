import { IntentHandler } from "@/engine/render/input/table_intents";
import { tableGestures } from "@/engine/tableau/gestures/table_gestures";
import { LaBelleLucieGame } from "./la_belle_lucie_game";
import { REDEAL_PILE_ID } from "./la_belle_lucie_zones";

/**
 * Returns what a press or a drop means in the La Belle Lucie family, where
 * pressing the redeal marker redeals.
 */
export function laBelleLucieGestures(game: LaBelleLucieGame): IntentHandler {
  return tableGestures(game, {
    onPilePress: (pileId) => {
      if (pileId === REDEAL_PILE_ID) {
        game.redeal();
      }
    },
  });
}
