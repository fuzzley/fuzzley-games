// The board shuffled, where a move left it without a bunch to make: each
// plain fuzzball shrinks, slides to its new square and springs back to
// its size.

import { squareOf } from "../../../rules/board/cells";
import type { Shuffle } from "../../../rules/move/record";
import type { GridShown } from "../../run_state";
import type { FeelTuning } from "../feel";
import { type Part, moves } from "../part";

/** Returns the parts of a shuffle from a moment, holding the board until it is done. */
export function shuffled(
  shuffle: Shuffle,
  atMs: number,
  grid: GridShown,
  feel: FeelTuning,
): readonly Part[] {
  return [
    ...shuffle.moves.flatMap(({ piece, to }) => [
      ...moves(piece, atMs, feel.shuffleShrinkMs, "out", {
        scaleX: feel.shuffleShrink,
        scaleY: feel.shuffleShrink,
      }),
      ...moves(
        piece,
        atMs + feel.shuffleMoveAfterMs,
        feel.shuffleMoveMs,
        "in-out",
        squareOf(to, grid.width),
      ),
      ...moves(
        piece,
        atMs + feel.shuffleGrowAfterMs,
        feel.shuffleGrowMs,
        "spring",
        { scaleX: 1, scaleY: 1 },
      ),
    ]),
    { what: "hold", atMs: atMs + feel.shuffleMs },
  ];
}
