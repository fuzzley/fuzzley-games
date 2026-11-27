// A brick: a pile of felt cushions, a layer for each hit it has left. It
// is never swapped and never falls, so the fuzzballs that fall past it
// roll in under it. A bunch beside it and a blast that strikes it each
// knock a layer off, and the hit that knocks off its last breaks it,
// which its goal counts. A wisp seeks a brick out, a thinner one first,
// while the goal is open, and any brick a little while it is not.

import { itemAt } from "@fz/core/records";
import type { BrickLayers } from "../catalog/elements";
import { WISP_BRICK_WORTH, WISP_BRICK_WORTH_MET, WISP_RANKS } from "../tuning";
import type { Change, ElementRule, SquareState } from "./element_rule";

/** The layers a brick has left once knocked, by the layers it had. */
const LAYERS_LEFT = { 2: 1, 3: 2, 4: 3 } as const satisfies Readonly<
  Record<Exclude<BrickLayers, 1>, BrickLayers>
>;

/** Returns whether a square holds a brick. */
function holdsBrick({ piece }: Pick<SquareState, "piece">): boolean {
  return piece?.what === "brick";
}

/** Returns a square's brick knocked: a layer off, or broken at its last, which counts; null for a square with no brick. */
function knocked({ piece, dust }: SquareState): Change | null {
  if (piece?.what !== "brick") {
    return null;
  }
  return piece.layers === 1
    ? { square: { piece: null, dust }, hit: "broken", counts: true }
    : {
        square: {
          piece: { ...piece, layers: LAYERS_LEFT[piece.layers] },
          dust,
        },
        hit: "knocked",
        counts: false,
      };
}

/** A brick's part in a move. */
export const BRICK_RULE: ElementRule = {
  holdsSwap: holdsBrick,
  holdsFall: holdsBrick,
  besideBunch: knocked,
  blasted: knocked,
  wisp: {
    rank: WISP_RANKS.brick,
    worth: ({ pieces }, square, goalOpen) => {
      const piece = itemAt(pieces, square);
      if (piece?.what !== "brick") {
        return null;
      }
      return goalOpen ? WISP_BRICK_WORTH - piece.layers : WISP_BRICK_WORTH_MET;
    },
  },
  goal: {
    id: "brick",
    countOn: ({ pieces }) =>
      pieces.filter((piece) => holdsBrick({ piece })).length,
  },
};
