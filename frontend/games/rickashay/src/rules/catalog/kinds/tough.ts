import type { Kind } from "../kinds";

/** The tough brick, of 2 to 6 hits, a strike taking a pip: Warm-up brings it in at level 4, Pips. */
export const TOUGH = {
  name: "Tough brick",
  hits: 2,
  mostHits: 6,
  needed: true,
  letters: ["2", "3", "4", "5", "6"],
  firstLevel: 4,
  traits: [],
} as const satisfies Kind;
