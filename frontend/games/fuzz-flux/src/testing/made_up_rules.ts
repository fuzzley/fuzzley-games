// Elements' rules for specs, so a spec can play a moment of a move with an
// element that takes part in it, or with none: none at all, the parts of
// each element's own rule that hold pieces and count goals, or every
// element's own rule whole; and the wind's, made up as the design's sketch
// plays it.

import { pick, recordOf } from "@fz/core/records";
import { ELEMENT_IDS, type ElementId } from "../rules/catalog/elements";
import type { ElementRule, WindRule } from "../rules/elements/element_rule";
import { ELEMENT_RULES } from "../rules/elements/element_rules";

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
  brick: pick(ELEMENT_RULES.brick, ["holdsSwap", "holdsFall"]),
  cage: pick(ELEMENT_RULES.cage, ["holdsSwap", "holdsFall"]),
  sleepyhead: pick(ELEMENT_RULES.sleepyhead, ["holdsSwap"]),
  burr: pick(ELEMENT_RULES.burr, ["holdsSwap"]),
};

/**
 * Every element's rule holding what `DESIGN_HOLDS` holds, and counting the
 * goal it counts for on a dealt board: every layer of dust, and every
 * brick, caged fuzzball and sleepyhead.
 */
export const DESIGN_HOLDS_AND_GOALS: Readonly<Record<ElementId, ElementRule>> =
  {
    dust: pick(ELEMENT_RULES.dust, ["goal"]),
    brick: pick(ELEMENT_RULES.brick, ["holdsSwap", "holdsFall", "goal"]),
    cage: pick(ELEMENT_RULES.cage, ["holdsSwap", "holdsFall", "goal"]),
    sleepyhead: pick(ELEMENT_RULES.sleepyhead, ["holdsSwap", "goal"]),
    burr: DESIGN_HOLDS.burr,
  };

/**
 * Every element's own rule, whole, as the game plays it: holding and
 * counting what `DESIGN_HOLDS_AND_GOALS` does, and taking the part the
 * design's sketch gives it as a wave strikes, as the board comes to rest
 * and after a move.
 */
export const DESIGN_PARTS: Readonly<Record<ElementId, ElementRule>> =
  ELEMENT_RULES;

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
