import type { TraitRule } from "../../flight/hooks";

/** A spring brick earns the flight a floor bounce, through `earn()`, as it breaks (C5). */
export const SPRINGS_RULE: TraitRule = {
  broken: (hooks) => {
    hooks.earn();
  },
};
