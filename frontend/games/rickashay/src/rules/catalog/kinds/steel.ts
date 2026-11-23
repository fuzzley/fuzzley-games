import type { Kind } from "../kinds";

/** The steel brick, which turns a fuzzball and takes nothing: Warm-up brings it in at level 7, Girders. */
export const STEEL = {
  name: "Steel brick",
  hits: "never",
  mostHits: 0,
  needed: false,
  letters: ["#"],
  firstLevel: 7,
  traits: [{ kind: "never" }],
} as const satisfies Kind;
