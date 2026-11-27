// A cage on a fuzzball: it keeps the fuzzball from being swapped, from
// falling and from taking the fur a frizzball gives. A bunch that takes
// the fuzzball in frees it as it is gathered or made what the bunch
// leaves; a blast opens the cage and leaves the fuzzball where it stands.
// A wisp seeks a caged fuzzball out before anything else, the more while
// the cages' goal is open, and the goal counts every cage the board is
// dealt.

import { itemAt } from "@fz/core/records";
import type { Fuzzball, Piece } from "../catalog/pieces";
import { WISP_CAGE_WORTH, WISP_RANKS } from "../tuning";
import type { Change, ElementRule, SquareState } from "./element_rule";

/** Returns whether a piece is a caged fuzzball. */
function isCaged(piece: Piece | null): piece is Fuzzball {
  return piece?.what === "fuzzball" && piece.caged;
}

/** Returns a square's caged fuzzball let out, which counts, with the hit the record writes of it, or null for a square with none. */
function letOut(
  { piece, dust }: SquareState,
  hit: "uncaged" | null,
): Change | null {
  return isCaged(piece)
    ? { square: { piece: { ...piece, caged: false }, dust }, hit, counts: true }
    : null;
}

/** The cage's part in a move. */
export const CAGE_RULE: ElementRule = {
  holdsSwap: ({ piece }) => isCaged(piece),
  holdsFall: ({ piece }) => isCaged(piece),
  // The bunch's own hit on the fuzzball, as it is gathered or made what the
  // bunch leaves, is enough.
  inBunch: (square) => letOut(square, null),
  blasted: (square) => letOut(square, "uncaged"),
  givenFur: (square) => (isCaged(square.piece) ? null : square),
  wisp: {
    rank: WISP_RANKS.cage,
    worth: ({ pieces }, square, goalOpen) => {
      if (!isCaged(itemAt(pieces, square))) {
        return null;
      }
      return goalOpen ? WISP_CAGE_WORTH.asked : WISP_CAGE_WORTH.unasked;
    },
  },
  goal: {
    id: "cage",
    countOn: ({ pieces }) => pieces.filter(isCaged).length,
  },
};
