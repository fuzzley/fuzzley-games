// The bricks' trait rules with those the game is yet to write made up for
// specs, so a spec flies the later kinds before each one's own rule exists,
// and the flight fixtures, made by hand by these, are flown as they were.

import { TRAIT_RULES } from "../rules/bricks/trait_rules";
import type { TraitRules } from "../rules/flight/hooks";

/**
 * The game's trait rules with the later kinds' made up for the specs: a
 * lock is shut by its tint's bolts.
 */
export const STAND_INS: TraitRules = {
  ...TRAIT_RULES,
  bolted: { bolts: ({ tint }) => tint },
};
