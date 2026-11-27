// A fuzzball picked up between moves: it grows a little and overshoots,
// raised over the board, and the fuzzballs it could bunch with if swapped
// look its way; and one put down, as it springs back to its size.

import { clamp } from "@fz/core/math";
import type { FeelTuning } from "../feel";
import { RAISED } from "../looks";
import { type Part, moves, sets } from "../part";
import type { Standing } from "../standing";

/**
 * Returns the parts of a fuzzball picked up, and of the fuzzballs that
 * would bunch with it in a swap looking its way, holding the board until
 * it has grown.
 *
 * Eyes turn no further than 1 either way, as far as they go, so each
 * looker's look is its way to the fuzzball across and down, held to that.
 */
export function pickedUp(
  held: Standing,
  lookers: readonly Standing[],
  feel: FeelTuning,
): readonly Part[] {
  return [
    ...sets(held.piece.id, 0, { raise: RAISED.held }),
    ...moves(held.piece.id, 0, feel.pickUpMs, "back", {
      scaleX: feel.pickUpScale,
      scaleY: feel.pickUpScale,
    }),
    ...lookers.flatMap(({ piece, at }) =>
      sets(piece.id, 0, {
        lookX: clamp(held.at.x - at.x, -1, 1),
        lookY: clamp(held.at.y - at.y, -1, 1),
      }),
    ),
    { what: "hold", atMs: feel.pickUpMs },
  ];
}

/**
 * Returns the parts of a fuzzball put down: it springs back from its size
 * picked up to its own, holding the board until it has.
 */
export function putDown(held: Standing, feel: FeelTuning): readonly Part[] {
  return [
    ...sets(held.piece.id, 0, {
      scaleX: feel.pickUpScale,
      scaleY: feel.pickUpScale,
    }),
    ...moves(held.piece.id, 0, feel.putDownMs, "spring", {
      scaleX: 1,
      scaleY: 1,
    }),
    { what: "hold", atMs: feel.putDownMs },
  ];
}
