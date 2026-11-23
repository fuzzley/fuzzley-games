import type { Kind } from "../kinds";

/** The moss brick, of 2 or 3 hits, which grows one back after every round it survives: Long rallies brings it in at level 28, Moss garden. */
export const MOSS = {
  name: "Moss brick",
  hits: 2,
  mostHits: 3,
  needed: true,
  letters: ["M", "N"],
  firstLevel: 28,
  traits: [{ kind: "regrows" }],
} as const satisfies Kind;
