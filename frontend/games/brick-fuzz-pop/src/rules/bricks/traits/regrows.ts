import type { TraitOf } from "../../catalog/bricks";
import type { TraitRule } from "../../flight/hooks";

/**
 * A brick that regrows takes hits in a flight as any other: it grows one
 * back only between rounds, before the wall comes down (`regrow()` in
 * `src/rules/wall/wall.ts`, the wall's `betweenRounds`), so it has no rule
 * for any moment of a flight.
 */
export const REGROWS_RULE: TraitRule<TraitOf["regrows"]> = {};
