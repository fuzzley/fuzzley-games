// Kinds of brick made up for specs, from before the catalog held their
// own: each stands in under the id of a kind the catalog holds, in a
// catalog a spec hands the rules, so a picture lays it out in that kind's
// character, and the random flights draw them beside the catalog's. With
// them, the rules they are flown by, and a strike as a brick's rules see
// it, so a trait's rule is specced on its own.

import { EARTHS_RULE } from "../rules/bricks/traits/earths";
import { FREES_RULE } from "../rules/bricks/traits/frees";
import { KICKS_RULE } from "../rules/bricks/traits/kicks";
import { NEVER_RULE } from "../rules/bricks/traits/never";
import { RECHARGES_RULE } from "../rules/bricks/traits/recharges";
import { REGROWS_RULE } from "../rules/bricks/traits/regrows";
import { SPLITS_RULE } from "../rules/bricks/traits/splits";
import { TELEPORTS_RULE } from "../rules/bricks/traits/teleports";
import { ZAPS_RULE } from "../rules/bricks/traits/zaps";
import {
  BRICK_KINDS,
  type BrickKind,
  type BrickKinds,
} from "../rules/catalog/bricks";
import type { Struck, TraitRules } from "../rules/flight/hooks";
import { FLOORWARD } from "../rules/grid";

/** A bumper made up for specs: round, never broken, kicking a fuzzball from a disc of 0.38. */
export const BUMPER: BrickKind = {
  ...BRICK_KINDS.steel,
  name: "Bumper",
  traits: [
    { kind: "never" },
    { kind: "earths" },
    { kind: "kicks", radius: 0.38 },
  ],
};

/** A portal made up for specs: never broken, and no solid, so a fuzzball flies into its cell. */
export const PORTAL: BrickKind = {
  ...BRICK_KINDS.steel,
  name: "Portal",
  solid: false,
  traits: [{ kind: "never" }, { kind: "teleports" }],
};

/**
 * The catalog with a bumper standing in for the row zapper and a portal for
 * the column zapper, so a picture's `-` is a bumper and its `|` a portal.
 */
export const STAND_INS: BrickKinds = {
  ...BRICK_KINDS,
  rowZapper: BUMPER,
  columnZapper: PORTAL,
};

/** A prism made up for specs: breaks at a hit, and splits the fuzzball that breaks it 30° either way. */
export const PRISM: BrickKind = {
  ...BRICK_KINDS.brick,
  name: "Prism",
  traits: [{ kind: "splits", cos: Math.sqrt(3) / 2, sin: 0.5 }],
};

/**
 * Rules for specs for every trait the flight's hooks serve: each brick's
 * own, but for plates and shells, which do nothing here.
 */
export const STAND_IN_RULES: TraitRules = {
  never: NEVER_RULE,
  earths: EARTHS_RULE,
  zaps: ZAPS_RULE,
  recharges: RECHARGES_RULE,
  frees: FREES_RULE,
  kicks: KICKS_RULE,
  splits: SPLITS_RULE,
  teleports: TELEPORTS_RULE,
  plated: {},
  shelled: {},
  regrows: REGROWS_RULE,
};

/** Returns a strike as a brick's rules see it before they run: a plain fuzzball's on an unplated brick's floorward face, but for what is given. */
export function struckOf(given: Partial<Struck> = {}): Struck {
  return {
    by: "fuzzball",
    side: FLOORWARD,
    plates: 0,
    charge: 0,
    hot: false,
    hurts: true,
    earths: false,
    ...given,
  };
}
