import type { Kind } from "../kinds";

/** The brick, which breaks at a strike: Warm-up brings it in at level 1, First bounce. */
export const BRICK = {
  name: "Brick",
  hits: 1,
  mostHits: 1,
  needed: true,
  letters: ["o"],
  firstLevel: 1,
  traits: [],
} as const satisfies Kind;
