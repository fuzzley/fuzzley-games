import { COLUMNS, MOST_DEPTH, ZAP_HITS } from "../../tuning";
import type { BrickKind } from "../bricks";

/** The kinds of brick Warm-up brings in, levels 1 to 9, in How to play's order. */
export const WARM_UP_KINDS = {
  brick: {
    name: "Brick",
    about: "Takes 1 hit.",
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
    about: "Takes 2 to 6 hits. The pips show how many are left.",
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
    about: "Can't be broken. Drains the charge of a fuzzball that hits it.",
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
    about: "Zaps every brick in its row when it breaks.",
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
    about: "Zaps every brick in its column when it breaks.",
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
