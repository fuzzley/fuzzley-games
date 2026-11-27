// The sleepyhead: a piece of its own, never swapped and never in a bunch,
// which falls as a fuzzball does and leaves the board once it comes to
// rest on a bed, the lowest open square of its column, which counts for
// its goal. A blast only ruffles it. While its goal is open, a wisp seeks
// out whatever holds a sleepyhead up.

import { itemAt } from "@fz/core/records";
import type { Board } from "../board/board";
import { WISP_RANKS, WISP_SLEEPYHEAD_WORTH } from "../tuning";
import type { ElementRule, SquareState } from "./element_rule";

/** The sleepyhead's part in a move. */
export const SLEEPYHEAD_RULE: ElementRule = {
  holdsSwap: isSleepyhead,
  blasted: (square) =>
    isSleepyhead(square) ? { square, hit: "ruffled", counts: false } : null,
  settled: (square, bed) =>
    bed && isSleepyhead(square)
      ? {
          square: { piece: null, dust: square.dust },
          hit: "bedded",
          counts: true,
        }
      : null,
  wisp: {
    rank: WISP_RANKS.sleepyhead,
    worth: (board, square, goalOpen) =>
      goalOpen && holdsUp(board, square) ? WISP_SLEEPYHEAD_WORTH : null,
  },
  goal: {
    id: "sleepyhead",
    countOn: ({ pieces }) =>
      pieces.filter((piece) => isSleepyhead({ piece })).length,
  },
};

/** Returns whether a square holds a sleepyhead. */
function isSleepyhead({ piece }: Pick<SquareState, "piece">): boolean {
  return piece?.what === "sleepyhead";
}

/** Returns whether a square's piece holds a sleepyhead up: the nearest piece above it in its column, past gaps and empty squares, is one. */
function holdsUp({ pieces, width }: Board, square: number): boolean {
  if (itemAt(pieces, square) === null) {
    return false;
  }
  for (let above = square - width; above >= 0; above -= width) {
    const piece = itemAt(pieces, above);
    if (piece !== null) {
      return isSleepyhead({ piece });
    }
  }
  return false;
}
