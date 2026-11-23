import type { Kind } from "../kinds";

/**
 * The plated brick, a tough brick with steel on its lower face, or on that
 * and both its sides, where a strike takes nothing, of 2 or 3 hits: Tricks
 * brings it in at level 22, Shutters.
 */
export const PLATED = {
  name: "Plated brick",
  hits: 2,
  mostHits: 3,
  needed: true,
  letters: ["v", "V", "U"],
  firstLevel: 22,
  traits: [{ kind: "plated" }],
} as const satisfies Kind;
