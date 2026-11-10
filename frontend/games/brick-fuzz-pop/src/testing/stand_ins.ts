// Kinds of brick the catalog doesn't hold yet, made up so the rules that
// will meet them are specced before they are built. Each stands in under
// the id of a kind the catalog holds, in a catalog a spec hands the rules,
// so a picture lays it out in that kind's character.

import {
  BRICK_KINDS,
  type BrickKind,
  type BrickKinds,
} from "../rules/catalog/bricks";
import type { TraitRules } from "../rules/flight/hooks";

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

/** A wool brick made up for specs: breaks at a hit, and charges the fuzzball that breaks it to the most. */
export const WOOL: BrickKind = {
  ...BRICK_KINDS.brick,
  name: "Wool brick",
  traits: [{ kind: "recharges" }],
};

/** A cage made up for specs: two hits, and frees a friend as it breaks. */
export const CAGE: BrickKind = {
  ...BRICK_KINDS.tough,
  name: "Cage",
  traits: [{ kind: "frees" }],
};

/**
 * Rules made up for specs for every trait the flight's hooks serve: steel
 * isn't hurt and earths a charge, a zapper zaps, wool recharges, a cage
 * frees a friend in ink 0, a bumper kicks, a prism splits and a portal
 * sends a fuzzball out of its twin; plates, shells and moss do nothing.
 */
export const STAND_IN_RULES: TraitRules = {
  never: {
    struck: (struck) => {
      struck.hurts = false;
    },
  },
  earths: {
    struck: (struck) => {
      struck.earths = true;
    },
  },
  zaps: {
    broken: (hooks, cell, _ball, { pattern, hits, reach }) => {
      hooks.zap(cell, pattern, hits, reach);
    },
  },
  recharges: {
    broken: (hooks, cell, ball) => {
      hooks.recharge(ball, cell);
    },
  },
  frees: {
    broken: (hooks, cell) => {
      hooks.free(cell, 0);
    },
  },
  kicks: {
    met: (hooks, ball, nx, ny) => {
      hooks.kick(ball, nx, ny);
    },
  },
  splits: {
    broken: (hooks, cell, ball, { cos, sin }) => {
      hooks.split(ball, cell, cos, sin);
    },
  },
  teleports: {
    entered: (hooks, ball, cell, twin) => {
      if (twin !== null) {
        hooks.teleport(ball, cell, twin);
      }
    },
  },
  plated: {},
  shelled: {},
  regrows: {},
};
