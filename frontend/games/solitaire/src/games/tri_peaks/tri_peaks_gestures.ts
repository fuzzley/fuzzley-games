import { IntentHandler } from "@/engine/render/input/table_intents";
import { playOnPress, tableGestures } from "@/games/common/table_gestures";
import { TriPeaksGame } from "./tri_peaks_game";
import { TriPeaksRole } from "./tri_peaks_zones";

/**
 * Returns what a press or a drop means in TriPeaks, where pressing the stock
 * turns a card and pressing a free card in the peaks plays it, as in Golf.
 */
export function triPeaksGestures(game: TriPeaksGame): IntentHandler {
  const play = playOnPress(game, [TriPeaksRole.PEAK]);
  return tableGestures(game, {
    onCardPress: (cardId, pile) => {
      if (pile?.role === TriPeaksRole.STOCK) {
        game.drawCard();
      } else {
        play(cardId, pile);
      }
    },
    autoMoveFrom: [],
  });
}
