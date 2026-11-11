import type { TraitOf } from "../../catalog/bricks";
import type { TraitRule } from "../../flight/hooks";

/**
 * A brick that never breaks takes no hit from anything that strikes it: a
 * fuzzball, charged or plain, a zap or a blast, which passes it by, so a
 * zapper behind steel still reaches the bricks beyond.
 */
export const NEVER_RULE: TraitRule<TraitOf["never"]> = {
  struck: (struck) => {
    struck.hurts = false;
  },
};
