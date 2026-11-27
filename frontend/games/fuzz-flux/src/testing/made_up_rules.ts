// Elements' rules made up for specs, so a spec can play a moment of a move
// with an element that takes part in it, or with none, whichever of the
// elements' own rules have been brought in; and the wind's, made up the
// same way.

import { itemAt, pick, recordOf } from "@fz/core/records";
import type { Board } from "../rules/board/board";
import { ELEMENT_IDS, type ElementId } from "../rules/catalog/elements";
import { BRICK_RULE } from "../rules/elements/brick";
import { BURR_RULE } from "../rules/elements/burr";
import { DUST_RULE } from "../rules/elements/dust";
import { SLEEPYHEAD_RULE } from "../rules/elements/sleepyhead";
import { WISP_RANKS } from "../rules/tuning";
import type {
  Change,
  ElementRule,
  SquareState,
  WindRule,
} from "../rules/elements/element_rule";

/** Every element's rule taking part in no moment of a move. */
export const NO_PART: Readonly<Record<ElementId, ElementRule>> = recordOf(
  ELEMENT_IDS,
  () => ({}),
);

/**
 * Every element's rule holding what the design says it holds, and taking
 * part in no other moment: a brick and a cage keep their pieces from being
 * swapped and from falling, and a sleepyhead and a burr theirs from being
 * swapped.
 */
export const DESIGN_HOLDS: Readonly<Record<ElementId, ElementRule>> = {
  dust: {},
  brick: pick(BRICK_RULE, ["holdsSwap", "holdsFall"]),
  cage: { holdsSwap: isCaged, holdsFall: isCaged },
  sleepyhead: pick(SLEEPYHEAD_RULE, ["holdsSwap"]),
  burr: pick(BURR_RULE, ["holdsSwap"]),
};

/**
 * Every element's rule holding what `DESIGN_HOLDS` holds, and counting the
 * goal it counts for on a dealt board: every layer of dust, and every
 * brick, caged fuzzball and sleepyhead.
 */
export const DESIGN_HOLDS_AND_GOALS: Readonly<Record<ElementId, ElementRule>> =
  {
    dust: pick(DUST_RULE, ["goal"]),
    brick: pick(BRICK_RULE, ["holdsSwap", "holdsFall", "goal"]),
    cage: {
      ...DESIGN_HOLDS.cage,
      goal: { id: "cage", countOn: (board) => countOf(board, isCaged) },
    },
    sleepyhead: pick(SLEEPYHEAD_RULE, ["holdsSwap", "goal"]),
    burr: DESIGN_HOLDS.burr,
  };

/**
 * Every element's rule holding and counting what `DESIGN_HOLDS_AND_GOALS` does,
 * and taking the part the design's sketch gives it as a wave strikes, dust,
 * bricks, the sleepyhead and burrs by their own rules: a bunch opens a cage and
 * brushes off a burr on each fuzzball it takes in, and knocks a brick or
 * brushes off a burr beside it; a blast knocks a brick, ruffles a sleepyhead,
 * opens a cage or brushes off a burr rather than gathering; a layer of dust is
 * swept from under each fuzzball gathered or made special and each square
 * struck bare; a caged fuzzball takes no fur the frizzball gives, and a burred
 * one loses its burr as it takes it; a wisp weighs a caged fuzzball, a brick,
 * whatever holds a sleepyhead up, a burr and a dusty square, in that order,
 * each worth more where its goal is open; a sleepyhead on a bed is put to bed
 * once the board is at rest, which counts; and after a move that brushed no
 * burr off, a burr spreads to a plain fuzzball beside one, drawn as the sketch
 * draws it.
 */
export const DESIGN_PARTS: Readonly<Record<ElementId, ElementRule>> = {
  dust: DUST_RULE,
  brick: BRICK_RULE,
  cage: {
    ...DESIGN_HOLDS_AND_GOALS.cage,
    inBunch: (square) => uncaged(square, null),
    blasted: (square) => uncaged(square, "uncaged"),
    givenFur: (square) => (isCaged(square) ? null : square),
    wisp: {
      rank: WISP_RANKS.cage,
      worth: ({ pieces }, square, goalOpen) => {
        if (!isCaged({ piece: itemAt(pieces, square) })) {
          return null;
        }
        return goalOpen ? 90 : 30;
      },
    },
  },
  sleepyhead: SLEEPYHEAD_RULE,
  burr: BURR_RULE,
};

/**
 * The wind's rule as the design's sketch plays it: after each move a
 * turning wind waits a move less, and once it has waited its moves it
 * turns the board's frame its quarters and begins its wait again.
 */
export const DESIGN_WIND: WindRule = {
  afterMove: (wind) =>
    wind.wait > 1
      ? { wind: { ...wind, wait: wind.wait - 1 }, quarters: 0 }
      : { wind: { ...wind, wait: wind.every }, quarters: wind.quarters },
};

/** Returns a caged fuzzball on a square let out, which counts, with the hit given. */
function uncaged(
  { piece, dust }: SquareState,
  hit: "uncaged" | null,
): Change | null {
  return piece?.what === "fuzzball" && piece.caged
    ? { square: { piece: { ...piece, caged: false }, dust }, hit, counts: true }
    : null;
}

/** Returns how many squares of a board a test holds for, asked of each square's piece. */
function countOf(
  { pieces }: Board,
  holds: (square: Pick<SquareState, "piece">) => boolean,
): number {
  return pieces.filter((piece) => holds({ piece })).length;
}

/** Returns whether a square holds a caged fuzzball. */
function isCaged({ piece }: Pick<SquareState, "piece">): boolean {
  return piece?.what === "fuzzball" && piece.caged;
}
