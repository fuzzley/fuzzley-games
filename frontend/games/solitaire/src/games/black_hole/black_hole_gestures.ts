import { IntentHandler } from "@/engine/render/input/table_intents";
import { playOnPress, tableGestures } from "@/games/common/table_gestures";
import { BlackHoleGame } from "./black_hole_game";
import { BlackHoleRole } from "./black_hole_zones";

/**
 * Returns what a press or a drop means in Black Hole and All in a Row, where
 * pressing a fan's top card plays it, as in Golf.
 */
export function blackHoleGestures(game: BlackHoleGame): IntentHandler {
  return tableGestures(game, {
    onCardPress: playOnPress(game, [BlackHoleRole.TABLEAU]),
    autoMoveFrom: [],
  });
}
