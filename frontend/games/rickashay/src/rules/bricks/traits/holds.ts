import type { TraitRule } from "../../flight/hooks";

/**
 * A hatch holds the fuzzball up, through `hold()`, at each turn that meets
 * it: off its bar's flat coming down, or off a cut end either way (C7).
 */
export const HOLDS_RULE: TraitRule = {
  met: (hooks) => {
    hooks.hold();
  },
};
