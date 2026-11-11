import type { TraitOf } from "../../catalog/bricks";
import type { TraitRule } from "../../flight/hooks";

/**
 * A brick that earths takes the charge of a fuzzball that strikes it, which
 * then turns, plain; `strike()` keeps a hot shot's, which nothing takes.
 */
export const EARTHS_RULE: TraitRule<TraitOf["earths"]> = {
  struck: (struck) => {
    struck.earths = true;
  },
};
