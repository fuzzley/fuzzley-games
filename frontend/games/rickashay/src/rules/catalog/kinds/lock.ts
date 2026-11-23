import type { Kind } from "../kinds";

/**
 * The lock, of 1, 2 or 3 bolts, shut until the flight's turns have slid
 * each back, when it breaks at a strike: Long rallies brings it in at level
 * 29, Combination.
 */
export const LOCK = {
  name: "Lock",
  hits: 1,
  mostHits: 1,
  needed: true,
  letters: ["x", "y", "z"],
  firstLevel: 29,
  traits: [{ kind: "bolted" }],
} as const satisfies Kind;
