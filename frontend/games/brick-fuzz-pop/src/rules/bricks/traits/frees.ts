import type { TraitOf } from "../../catalog/bricks";
import type { TraitRule } from "../../flight/hooks";

/**
 * A cage, as it breaks, frees the friend it holds in its tint, the friend's
 * ink, to fly behind the player's fuzzball every round left of the level;
 * a zap or a blast that breaks it frees the friend as a fuzzball does.
 */
export const FREES_RULE: TraitRule<TraitOf["frees"]> = {
  broken: (hooks, cell, _ball, _trait, tint) => {
    hooks.free(cell, tint);
  },
};
