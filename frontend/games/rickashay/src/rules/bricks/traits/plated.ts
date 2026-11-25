import type { TraitRule } from "../../flight/hooks";

/**
 * A plated brick shields itself from a turn off its plates alone: where
 * every side the turn met it on is plated, the strike takes nothing.
 *
 * A strike that met no side of it, which no face of a plated brick gives,
 * takes its hit, rather than being shielded by an empty match.
 */
export const PLATED_RULE: TraitRule = {
  struck: (struck) => {
    const { sides, brick } = struck;
    if (sides !== 0 && (brick.plates & sides) === sides) {
      struck.shield = "plate";
    }
  },
};
