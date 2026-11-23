import { MOST_DEPTH } from "@fz/brick-wall/rules/field";
import { ZAP_HITS } from "../../tuning";
import type { BrickKind } from "../bricks";

/**
 * The kinds of brick Sparks brings in, levels 10 to 18, in How to play's
 * order: the bomb, the cross and X zappers, wool and the cage.
 */
export const SPARKS_KINDS = {
  bomb: {
    name: "Bomb",
    about: "Blasts the 8 bricks around it when it breaks.",
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
    about: "Zaps every brick in its row and column when it breaks.",
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
    about: "Zaps 3 spaces each way along both diagonals when it breaks.",
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
    about: "Charges any fuzzball that hits it to full.",
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
      "Takes 2 hits. Frees a friend who follows your fuzzball for the rest of the level.",
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
