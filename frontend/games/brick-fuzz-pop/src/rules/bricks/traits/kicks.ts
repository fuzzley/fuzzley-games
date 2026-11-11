import type { TraitOf } from "../../catalog/bricks";
import type { TraitRule } from "../../flight/hooks";

/**
 * A bumper kicks a fuzzball that meets its disc straight away from its
 * middle, along the line out of it that `cast()` finds from the disc's
 * radius, whichever way the fuzzball came. Its other traits keep it whole
 * and take the charge.
 */
export const KICKS_RULE: TraitRule<TraitOf["kicks"]> = {
  met: (hooks, ball, nx, ny) => {
    hooks.kick(ball, nx, ny);
  },
};
