import type { TraitOf } from "../../catalog/bricks";
import type { TraitRule } from "../../flight/hooks";

/**
 * Wool, as it breaks, charges the fuzzball that broke it to the most, which
 * flies on with it; a zap or a blast that breaks it charges nothing, as it
 * has no fuzzball to charge.
 */
export const RECHARGES_RULE: TraitRule<TraitOf["recharges"]> = {
  broken: (hooks, cell, ball) => {
    hooks.recharge(ball, cell);
  },
};
