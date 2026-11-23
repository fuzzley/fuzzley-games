import type { Kind } from "../kinds";

/** The gem, a brick set on its point, all four of its faces at 45°: Tricks brings it in at level 19, Gems. */
export const GEM = {
  name: "Gem",
  hits: 1,
  mostHits: 1,
  needed: true,
  letters: ["G"],
  firstLevel: 19,
  traits: [{ kind: "faceted" }],
} as const satisfies Kind;
