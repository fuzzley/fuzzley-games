import type { Kind } from "../kinds";

/** The hatch, a steel bar a fuzzball rises through and is held up by coming down: Angles brings it in at level 12, Trapdoor. */
export const HATCH = {
  name: "Hatch",
  hits: "never",
  mostHits: 0,
  needed: false,
  letters: ["="],
  firstLevel: 12,
  traits: [{ kind: "never" }, { kind: "holds" }],
} as const satisfies Kind;
