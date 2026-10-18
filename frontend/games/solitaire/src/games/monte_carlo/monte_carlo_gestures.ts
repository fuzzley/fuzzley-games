import { IntentHandler } from "@/engine/render/input/table_intents";
import { tableGestures } from "@/engine/tableau/gestures/table_gestures";
import { MonteCarloGame } from "./monte_carlo_game";
import { MonteCarloRole, STOCK_PILE_ID } from "./monte_carlo_zones";

/**
 * Returns what a press or a drop means in Monte Carlo, where pressing the
 * stock, or its slot once it is empty, consolidates the grid.
 */
export function monteCarloGestures(game: MonteCarloGame): IntentHandler {
  return tableGestures(game, {
    onCardPress: (_cardId, pile) => {
      if (pile?.role === MonteCarloRole.STOCK) {
        game.consolidate();
      }
    },
    onPilePress: (pileId) => {
      if (pileId === STOCK_PILE_ID) {
        game.consolidate();
      }
    },
    autoMoveFrom: [MonteCarloRole.CELL],
  });
}
