import type { BrickKind } from "../bricks";

/** The kinds of brick Thick walls brings in, levels 28 to 36, in How to play's order. */
export const THICK_WALL_KINDS = {
  shell: {
    name: "Shell brick",
    about: "Takes 2 or 3 hits. A fuzzball with no charge bounces off.",
    hits: 2,
    mostHits: 3,
    needed: true,
    points: 10,
    solid: true,
    firstLevel: 28,
    traits: [{ kind: "shelled" }],
  },
  moss: {
    name: "Moss brick",
    about: "Takes 2 or 3 hits. Grows a hit back after each shot.",
    hits: 2,
    mostHits: 3,
    needed: true,
    points: 10,
    solid: true,
    firstLevel: 29,
    traits: [{ kind: "regrows" }],
  },
} as const satisfies Readonly<Record<string, BrickKind>>;
