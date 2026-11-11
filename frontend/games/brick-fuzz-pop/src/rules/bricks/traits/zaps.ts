import type { TraitOf } from "../../catalog/bricks";
import type { TraitRule } from "../../flight/hooks";

/**
 * A zapper or a bomb, as it breaks, sets off a zap or a blast of its
 * pattern from its cell, which `fly()` lands half a unit later: along its
 * row, its column, both, its diagonals, or about it.
 */
export const ZAPS_RULE: TraitRule<TraitOf["zaps"]> = {
  broken: (hooks, cell, _ball, { pattern, hits, reach }) => {
    hooks.zap(cell, pattern, hits, reach);
  },
};
