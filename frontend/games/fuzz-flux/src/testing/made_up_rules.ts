// Elements' rules made up for specs, so a spec can play a moment of a move
// with an element that takes part in it, or with none, whichever of the
// elements' own rules have been brought in.

import { recordOf } from "@fz/core/records";
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

/** Returns whether a square holds a brick. */
function isBrick({ piece }: SquareState): boolean {
  return piece?.what === "brick";
}

/** Returns whether a square holds a caged fuzzball. */
function isCaged({ piece }: SquareState): boolean {
  return piece?.what === "fuzzball" && piece.caged;
}
