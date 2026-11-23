import type { Kind } from "../kinds";

/** The spring brick, whose break gives the flight a floor bounce: Angles brings it in at level 13, Springboard. */
export const SPRING = {
  name: "Spring brick",
  hits: 1,
  mostHits: 1,
  needed: true,
  letters: ["S"],
  firstLevel: 13,
  traits: [{ kind: "springs" }],
} as const satisfies Kind;
