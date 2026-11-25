import type { TraitRule } from "../../flight/hooks";

/**
 * A portal takes a fuzzball whose middle crosses into its eye to the same
 * place in its twin's eye, flying on the same way, as C6 has it.
 *
 * Passing a portal is no turn, and every eye is air until the fuzzball
 * next turns, which are fly()'s; a portal whose twin waits over the
 * ceiling has no eye, which is the faces'; and a portal with no twin takes
 * it nowhere.
 */
export const TELEPORTS_RULE: TraitRule = {
  entered: (hooks, _, { twin }) => {
    if (twin !== null) {
      hooks.teleport(twin);
    }
  },
};
