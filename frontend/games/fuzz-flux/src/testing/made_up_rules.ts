// Elements' rules made up for specs, so a spec can play a moment of a move
// with an element that takes part in it, or with none, whichever of the
// elements' own rules have been brought in.

import { recordOf } from "@fz/core/records";
import type { Board } from "../rules/board/board";
import { ELEMENT_IDS, type ElementId } from "../rules/catalog/elements";
import type { ElementRule, SquareState } from "../rules/elements/element_rule";

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
  brick: { holdsSwap: isBrick, holdsFall: isBrick },
  cage: { holdsSwap: isCaged, holdsFall: isCaged },
  sleepyhead: {
    holdsSwap: ({ piece }) => piece?.what === "sleepyhead",
  },
  burr: {
    holdsSwap: ({ piece }) => piece?.what === "fuzzball" && piece.burred,
  },
};

/**
 * Every element's rule holding what `DESIGN_HOLDS` holds, and counting the
 * goal it counts for on a dealt board: every layer of dust, and every
 * brick, caged fuzzball and sleepyhead.
 */
export const DESIGN_HOLDS_AND_GOALS: Readonly<Record<ElementId, ElementRule>> =
  {
    dust: {
      goal: {
        id: "dust",
        countOn: ({ dust }) =>
          dust.reduce<number>((sum, layers) => sum + layers, 0),
      },
    },
    brick: {
      ...DESIGN_HOLDS.brick,
      goal: { id: "brick", countOn: (board) => countOf(board, isBrick) },
    },
    cage: {
      ...DESIGN_HOLDS.cage,
      goal: { id: "cage", countOn: (board) => countOf(board, isCaged) },
    },
    sleepyhead: {
      ...DESIGN_HOLDS.sleepyhead,
      goal: {
        id: "sleepyhead",
        countOn: (board) =>
          countOf(board, ({ piece }) => piece?.what === "sleepyhead"),
      },
    },
    burr: DESIGN_HOLDS.burr,
  };

/** Returns how many squares of a board a test holds for, asked of each square's piece. */
function countOf(
  { pieces }: Board,
  holds: (square: Pick<SquareState, "piece">) => boolean,
): number {
  return pieces.filter((piece) => holds({ piece })).length;
}

/** Returns whether a square holds a brick. */
function isBrick({ piece }: Pick<SquareState, "piece">): boolean {
  return piece?.what === "brick";
}

/** Returns whether a square holds a caged fuzzball. */
function isCaged({ piece }: Pick<SquareState, "piece">): boolean {
  return piece?.what === "fuzzball" && piece.caged;
}
