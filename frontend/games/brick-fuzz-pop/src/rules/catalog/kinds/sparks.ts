import { MOST_DEPTH, ZAP_HITS } from "../../tuning";
import type { BrickKind } from "../bricks";

/**
 * The kinds of brick Sparks brings in, levels 10 to 18, in How to play's
 * order: the bomb, the cross and X zappers, wool and the cage.
 */
export const SPARKS_KINDS = {
  bomb: {
    name: "Bomb",
    about: "As it breaks, blasts the eight bricks around it.",
    hits: 1,
    mostHits: 1,
    needed: true,
    points: 30,
    solid: true,
    firstLevel: 10,
    traits: [{ kind: "zaps", pattern: "blast", hits: ZAP_HITS, reach: 1 }],
  },
  crossZapper: {
    name: "Cross zapper",
    about:
      "As it breaks, zaps every brick in its row and in its column, as far as the ceiling.",
    hits: 1,
    mostHits: 1,
    needed: true,
    points: 30,
    solid: true,
    firstLevel: 11,
    // Far enough to reach the ceiling of the deepest field from its floor,
    // and so to cross the field along its row.
    traits: [
      { kind: "zaps", pattern: "cross", hits: ZAP_HITS, reach: MOST_DEPTH },
    ],
  },
  xZapper: {
    name: "X zapper",
    about:
      "As it breaks, zaps the bricks along both its diagonals, three cells each way.",
    hits: 1,
    mostHits: 1,
    needed: true,
    points: 30,
    solid: true,
    firstLevel: 13,
    // plan.md's three cells along each diagonal.
    traits: [{ kind: "zaps", pattern: "x", hits: ZAP_HITS, reach: 3 }],
  },
  wool: {
    name: "Wool brick",
    about:
      "Breaks at a hit, and charges the fuzzball that breaks it to full; a zap or a blast only breaks it.",
    hits: 1,
    mostHits: 1,
    needed: true,
    points: 30,
    solid: true,
    firstLevel: 14,
    traits: [{ kind: "recharges" }],
  },
  cage: {
    name: "Cage",
    about:
      "Takes two hits, and as it breaks frees a friend, who flies behind the fuzzball every round left of the level.",
    hits: 2,
    mostHits: 2,
    needed: true,
    // plan.md's 50 for a cage of two hits.
    points: 25,
    solid: true,
    firstLevel: 15,
    traits: [{ kind: "frees" }],
  },
} as const satisfies Readonly<Record<string, BrickKind>>;
