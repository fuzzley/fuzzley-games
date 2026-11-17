import type { BrickKind } from "../bricks";

/** The kinds of brick Tricks brings in, levels 19 to 27, in How to play's order. */
export const TRICKS_KINDS = {
  bumper: {
    name: "Bumper",
    about: "Can't be broken. Knocks the fuzzball away and drains its charge.",
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
    about: "Splits the fuzzball into 3.",
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
      "Can't be broken. Sends the fuzzball out of the other portal with the same mark.",
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
      "Takes 2 or 3 hits. Its steel plates take none and drain the charge.",
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
