import type { TraitOf } from "../../catalog/bricks";
import type { TraitRule } from "../../flight/hooks";
import { MOST_CHARGE } from "../../tuning";

/**
 * Wool charges the fuzzball that strikes it to the most as it strikes, so
 * even a plain one breaks it and flies on through, and again as it breaks,
 * so it flies on with the most; a zap or a blast that breaks it charges
 * nothing, as it has no fuzzball to charge.
 */
export const RECHARGES_RULE: TraitRule<TraitOf["recharges"]> = {
  struck: (struck) => {
    if (struck.by === "fuzzball") {
      struck.charge = MOST_CHARGE;
    }
  },
  broken: (hooks, cell, ball) => {
    hooks.recharge(ball, cell);
  },
};
