import type { Kind } from "../kinds";

/**
 * The portal, which sends a fuzzball that flies into its eye out of its
 * twin's, written for its pair, the first or the second: Tricks brings it
 * in at level 21, Elevator.
 */
export const PORTAL = {
  name: "Portal",
  hits: "never",
  mostHits: 0,
  needed: false,
  letters: ["@", "&"],
  firstLevel: 21,
  traits: [{ kind: "never" }, { kind: "teleports" }],
} as const satisfies Kind;
