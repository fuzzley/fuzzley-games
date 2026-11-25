import type { TraitRule } from "../../flight/hooks";

/**
 * A moss brick's regrowth, which acts at no moment of a flight: it takes
 * its hits in a flight as any brick does, and grows one back only between
 * rounds, as `../wall_rules.ts`' `WALL_RULES` has it, up to what it began
 * with.
 */
export const REGROWS_RULE: TraitRule = {};
