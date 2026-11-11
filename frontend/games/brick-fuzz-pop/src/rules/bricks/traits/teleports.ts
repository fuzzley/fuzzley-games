import type { TraitOf } from "../../catalog/bricks";
import type { TraitRule } from "../../flight/hooks";

/**
 * A portal sends a fuzzball whose middle crosses into its cell out of its
 * twin's middle, flying the same way. One with no twin lets it pass, and
 * the hook lets it pass a portal whose twin waits over the ceiling, so a
 * portal is shut until both stand in the field.
 */
export const TELEPORTS_RULE: TraitRule<TraitOf["teleports"]> = {
  entered: (hooks, ball, cell, twin) => {
    if (twin !== null) {
      hooks.teleport(ball, cell, twin);
    }
  },
};
