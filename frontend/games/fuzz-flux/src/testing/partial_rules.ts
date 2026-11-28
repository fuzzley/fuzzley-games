// Elements' rules with only some of each element's own rule taking part,
// for specs that keep the rest out of what they try: none of it, or only
// the parts that hold pieces and count goals. A spec that wants the rules
// whole takes `ELEMENT_RULES`.

import { pick, recordOf } from "@fz/core/records";
import { ELEMENT_IDS, type ElementId } from "../rules/catalog/elements";
import type { ElementRule } from "../rules/elements/element_rule";
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
export const HOLDS_ONLY: Readonly<Record<ElementId, ElementRule>> = {
  dust: {},
  brick: pick(ELEMENT_RULES.brick, ["holdsSwap", "holdsFall"]),
  cage: pick(ELEMENT_RULES.cage, ["holdsSwap", "holdsFall"]),
  sleepyhead: pick(ELEMENT_RULES.sleepyhead, ["holdsSwap"]),
  burr: pick(ELEMENT_RULES.burr, ["holdsSwap"]),
};

/**
 * Every element's rule holding what `HOLDS_ONLY` holds, and counting the
 * goal it counts for on a dealt board: every layer of dust, and every
 * brick, caged fuzzball and sleepyhead.
 */
export const HOLDS_AND_GOALS: Readonly<Record<ElementId, ElementRule>> = {
  dust: pick(ELEMENT_RULES.dust, ["goal"]),
  brick: pick(ELEMENT_RULES.brick, ["holdsSwap", "holdsFall", "goal"]),
  cage: pick(ELEMENT_RULES.cage, ["holdsSwap", "holdsFall", "goal"]),
  sleepyhead: pick(ELEMENT_RULES.sleepyhead, ["holdsSwap", "goal"]),
  burr: HOLDS_ONLY.burr,
};
