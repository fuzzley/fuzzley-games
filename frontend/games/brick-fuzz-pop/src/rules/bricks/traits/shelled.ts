import type { TraitOf } from "../../catalog/bricks";
import type { TraitRule } from "../../flight/hooks";

/**
 * A shelled brick is hurt only by charge, a zap or a blast, and earths
 * nothing: a fuzzball with no charge, a friend or a prism's two among
 * them, takes no hit off it and turns, and the strike doesn't count as a
 * hit against its boredom.
 */
export const SHELLED_RULE: TraitRule<TraitOf["shelled"]> = {
  struck: (struck) => {
    if (struck.by === "fuzzball" && struck.charge === 0) {
      struck.hurts = false;
    }
  },
};
