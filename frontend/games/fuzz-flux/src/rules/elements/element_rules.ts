// Each element's rule, by its id. An element whose package has yet to
// bring its rule plays by the stand-in, which takes no part in any moment,
// so a level is played and its golden games run as the element's rule
// lands: the package writes the rule in a file of its own, sets it here,
// and takes its id off `STAND_INS`.

import type { ElementId } from "../catalog/elements";
import type { ElementRule } from "./element_rule";

/** The rule of an element still to be brought in, which takes no part in any moment of a move. */
const STAND_IN: ElementRule = {};

/** Every element that plays by the stand-in, its rule still to be brought in. */
export const STAND_INS = [
  "dust",
  "brick",
  "cage",
  "sleepyhead",
  "burr",
] as const satisfies readonly ElementId[];

/** Each element's rule, by its id. */
export const ELEMENT_RULES = {
  dust: STAND_IN,
  brick: STAND_IN,
  cage: STAND_IN,
  sleepyhead: STAND_IN,
  burr: STAND_IN,
} as const satisfies Readonly<Record<ElementId, ElementRule>>;
