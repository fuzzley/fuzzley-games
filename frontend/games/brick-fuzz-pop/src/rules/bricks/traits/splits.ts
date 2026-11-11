import type { TraitOf } from "../../catalog/bricks";
import type { TraitRule } from "../../flight/hooks";

/**
 * A prism splits the fuzzball that breaks it: two more leave from where it
 * is, along the heading it leaves with, turned by the trait's angle either
 * way, plain. A prism a zap or a blast breaks only breaks, since a split is
 * a fuzzball's, and the hook makes none for no fuzzball.
 */
export const SPLITS_RULE: TraitRule<TraitOf["splits"]> = {
  broken: (hooks, cell, ball, { cos, sin }) => {
    hooks.split(ball, cell, cos, sin);
  },
};
