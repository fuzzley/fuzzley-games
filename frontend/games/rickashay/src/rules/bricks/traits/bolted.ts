import type { TraitRule } from "../../flight/hooks";

/**
 * A lock is shut by its bolts, 1 to 3, its tint as the legend writes it,
 * read as the flight starts (C4).
 *
 * The rest is fly()'s: it draws a bolt back on every lock in the field at
 * every `FlightRules.boltTurns`th turn while one is still shut, shields a
 * lock that is, and strikes one that isn't, which breaks it at its one hit.
 */
export const BOLTED_RULE: TraitRule = {
  bolts: ({ tint }) => tint,
};
