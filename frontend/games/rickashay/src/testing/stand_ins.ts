// The bricks' trait rules with those the game is yet to write made up for
// specs, so a spec flies the later kinds before each one's own rule exists,
// and the flight fixtures, made by hand by these, are flown as they were.

import { TRAIT_RULES } from "../rules/bricks/trait_rules";
import type { TraitRules } from "../rules/flight/hooks";

/**
 * The game's trait rules with the later kinds' made up for the specs: a
 * plated brick takes nothing where a turn met its plates alone, a spring
 * brick earns a floor bounce as it breaks, a hatch holds the fuzzball up
 * as it meets it, a lock is shut by its tint's bolts, and a portal takes
 * the fuzzball to its twin.
 */
export const STAND_INS: TraitRules = {
  ...TRAIT_RULES,
  plated: {
    struck: (struck) => {
      const { sides, brick } = struck;
      if (sides !== 0 && (brick.plates & sides) === sides) {
        struck.shield = "plate";
      }
    },
  },
  springs: {
    broken: (hooks) => {
      hooks.earn();
    },
  },
  holds: {
    met: (hooks) => {
      hooks.hold();
    },
  },
  bolted: { bolts: ({ tint }) => tint },
  teleports: {
    entered: (hooks, _, { twin }) => {
      if (twin !== null) {
        hooks.teleport(twin);
      }
    },
  },
};
