// Each element's rule, by its id, and the wind's. An element whose package
// has yet to bring its rule plays by the stand-in, which takes no part in
// any moment, so a level is played and its golden games run as the
// element's rule lands: the package writes the rule in a file of its own,
// sets it here, and takes its id off `STAND_INS`. The wind's package sets
// its rule here the same way.

import type { ElementId } from "../catalog/elements";
import { BURR_RULE } from "./burr";
import { DUST_RULE } from "./dust";
import type { ElementRule, WindRule } from "./element_rule";
import { SLEEPYHEAD_RULE } from "./sleepyhead";

/** The rule of an element still to be brought in, which takes no part in any moment of a move. */
const STAND_IN: ElementRule = {};

/** Every element that plays by the stand-in, its rule still to be brought in. */
export const STAND_INS = [
  "brick",
  "cage",
] as const satisfies readonly ElementId[];

/** Each element's rule, by its id. */
export const ELEMENT_RULES = {
  dust: DUST_RULE,
  brick: STAND_IN,
  cage: STAND_IN,
  sleepyhead: SLEEPYHEAD_RULE,
  burr: BURR_RULE,
} as const satisfies Readonly<Record<ElementId, ElementRule>>;

/** The wind's rule, the stand-in until its package brings it in: a wind that turns waits for good. */
export const WIND_RULE: WindRule = {};
