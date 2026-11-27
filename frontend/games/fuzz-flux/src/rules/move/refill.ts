// What a lane lets in at the top of the board's frame: a fuzzball of a
// kind drawn from the deal's seed, the lane's key and how many the lane has
// let in before, so a bunch elsewhere never changes what falls in here.
// Each frame of the board has lanes of its own, keyed apart.

import { hashOf } from "@fz/core/random";
import { itemAt } from "@fz/core/records";
import type { Game } from "../board/board";
import type { KindId } from "../catalog/kinds";
import { LANE_KEYS_A_TURN, SALTS } from "../draws";

/**
 * Returns the kind of the fuzzball a lane of a game's frame lets in after
 * so many it has let in before.
 */
export function refillKind(
  game: Pick<Game, "seed" | "kinds" | "turns">,
  lane: number,
  letIn: number,
): KindId {
  const key = game.turns * LANE_KEYS_A_TURN + lane;
  const draw = hashOf(game.seed, key, letIn, SALTS.refill);
  return itemAt(game.kinds, draw % game.kinds.length);
}
