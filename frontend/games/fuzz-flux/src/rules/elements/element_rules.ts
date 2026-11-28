// Each element's rule, by its id, each written in a file of its own, and
// the wind's. Every element's package has set its rule here and taken its
// id off `STAND_INS`, so a level is played, and its golden games run, by
// the rules of every element it holds. The wind's package has set its rule
// here the same way.

import type { ElementId } from "../catalog/elements";
import { GUST_RULE } from "../wind/gust";
import { BRICK_RULE } from "./brick";
import { BURR_RULE } from "./burr";
import { CAGE_RULE } from "./cage";
import { DUST_RULE } from "./dust";
import type { ElementRule, WindRule } from "./element_rule";
import { SLEEPYHEAD_RULE } from "./sleepyhead";

/** Every element whose rule is still to be brought in: none, as each element's package has brought its own. */
export const STAND_INS = [] as const satisfies readonly ElementId[];

/** Each element's rule, by its id. */
export const ELEMENT_RULES = {
  dust: DUST_RULE,
  brick: BRICK_RULE,
  cage: CAGE_RULE,
  sleepyhead: SLEEPYHEAD_RULE,
  burr: BURR_RULE,
} as const satisfies Readonly<Record<ElementId, ElementRule>>;

/** The wind's rule, as its package brings it in: a wind that turns waits its moves, then turns. */
export const WIND_RULE: WindRule = GUST_RULE;
