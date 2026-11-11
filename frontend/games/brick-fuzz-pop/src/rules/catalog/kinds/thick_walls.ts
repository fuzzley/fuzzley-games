import type { BrickKind } from "../bricks";

/** The kinds of brick Thick walls brings in, levels 28 to 36, in How to play's order. */
export const THICK_WALL_KINDS = {
  shell: {
    name: "Shell brick",
    about:
      "Takes two or three hits, from charge, a zap or a blast alone: a plain fuzzball turns off it.",
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
    about:
      "Takes two or three hits, and grows one back after each round it survives, up to its full hits.",
    hits: 2,
    mostHits: 3,
    needed: true,
    points: 10,
    solid: true,
    firstLevel: 29,
    traits: [{ kind: "regrows" }],
  },
} as const satisfies Readonly<Record<string, BrickKind>>;
