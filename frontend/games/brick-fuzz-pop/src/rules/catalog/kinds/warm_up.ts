import { COLUMNS, MOST_DEPTH, ZAP_HITS } from "../../tuning";
import type { BrickKind } from "../bricks";

/** The kinds of brick Warm-up brings in, levels 1 to 9, in How to play's order. */
export const WARM_UP_KINDS = {
  brick: {
    name: "Brick",
    about: "Breaks at a hit.",
    hits: 1,
    mostHits: 1,
    needed: true,
    points: 10,
    solid: true,
    firstLevel: 1,
    traits: [],
  },
  tough: {
    name: "Tough brick",
    about: "Takes two to six hits, a pip for each one left.",
    hits: 2,
    mostHits: 6,
    needed: true,
    points: 10,
    solid: true,
    firstLevel: 3,
    traits: [],
  },
  steel: {
    name: "Steel brick",
    about:
      "Never breaks: it turns every fuzzball and earths its charge, lets zaps through, and sinks into the floor.",
    hits: "never",
    mostHits: 0,
    needed: false,
    points: 0,
    solid: true,
    firstLevel: 5,
    traits: [{ kind: "never" }, { kind: "earths" }],
  },
  rowZapper: {
    name: "Row zapper",
    about: "As it breaks, zaps every brick in its row.",
    hits: 1,
    mostHits: 1,
    needed: true,
    points: 30,
    solid: true,
    firstLevel: 6,
    // Far enough to cross the field whichever column it stands in.
    traits: [{ kind: "zaps", pattern: "row", hits: ZAP_HITS, reach: COLUMNS }],
  },
  columnZapper: {
    name: "Column zapper",
    about:
      "As it breaks, zaps every brick in its column, as far as the ceiling.",
    hits: 1,
    mostHits: 1,
    needed: true,
    points: 30,
    solid: true,
    firstLevel: 7,
    // Far enough to reach the ceiling of the deepest field from its floor.
    traits: [
      { kind: "zaps", pattern: "column", hits: ZAP_HITS, reach: MOST_DEPTH },
    ],
  },
} as const satisfies Readonly<Record<string, BrickKind>>;
