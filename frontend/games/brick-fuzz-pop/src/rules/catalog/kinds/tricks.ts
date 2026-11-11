import type { BrickKind } from "../bricks";

/** The kinds of brick Tricks brings in, levels 19 to 27, in How to play's order. */
export const TRICKS_KINDS = {
  bumper: {
    name: "Bumper",
    about:
      "Never breaks: round, it kicks every fuzzball straight away from its middle and earths its charge, lets zaps through, and sinks into the floor.",
    hits: "never",
    mostHits: 0,
    needed: false,
    points: 0,
    solid: true,
    firstLevel: 19,
    traits: [
      { kind: "never" },
      { kind: "earths" },
      { kind: "kicks", radius: 0.38 },
    ],
  },
  prism: {
    name: "Prism",
    about:
      "Breaks at a hit, and two more fuzzballs leave from it, 30° either side of the one that broke it; a zap or a blast only breaks it.",
    hits: 1,
    mostHits: 1,
    needed: true,
    points: 30,
    solid: true,
    firstLevel: 20,
    // 30°, as its cosine and sine: √3/2 and 1/2.
    traits: [{ kind: "splits", cos: 0.8660254037844386, sin: 0.5 }],
  },
  portal: {
    name: "Portal",
    about:
      "Never breaks, and stops nothing: a fuzzball whose middle flies into it comes out of its twin, flying the same way, while both stand in the field, and it sinks with its twin.",
    hits: "never",
    mostHits: 0,
    needed: false,
    points: 0,
    solid: false,
    firstLevel: 21,
    traits: [{ kind: "never" }, { kind: "teleports" }],
  },
  plated: {
    name: "Plated brick",
    about:
      "Takes two or three hits, a pip for each one left, but none through its steel plates, which earth the charge; zaps and blasts still hurt it.",
    hits: 2,
    mostHits: 3,
    needed: true,
    points: 10,
    solid: true,
    firstLevel: 22,
    // Plated only on the faces its brick's plates name, and earthing only there.
    traits: [{ kind: "plated" }],
  },
} as const satisfies Readonly<Record<string, BrickKind>>;
