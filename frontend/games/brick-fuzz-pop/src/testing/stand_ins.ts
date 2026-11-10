// Kinds of brick the catalog doesn't hold yet, made up so the rules that
// will meet them are specced before they are built. Each stands in under
// the id of a kind the catalog holds, in a catalog a spec hands the rules,
// so a picture lays it out in that kind's character.

import {
  BRICK_KINDS,
  type BrickKind,
  type BrickKinds,
} from "../rules/catalog/bricks";

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
