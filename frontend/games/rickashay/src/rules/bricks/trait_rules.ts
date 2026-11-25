import type { TraitRules } from "../flight/hooks";
import { FACETED_RULE } from "./traits/faceted";
import { HOLDS_RULE } from "./traits/holds";
import { PLATED_RULE } from "./traits/plated";
import { SLANTS_RULE } from "./traits/slants";
import { SPRINGS_RULE } from "./traits/springs";
import { TELEPORTS_RULE } from "./traits/teleports";

/**
 * What each brick trait does at the moments of a flight, typed so a trait
 * without its rule fails to compile.
 *
 * A rule with no moments does nothing at them: never breaking is the
 * catalog's, read by `takesStrikes()`, a ramp's and a gem's slants are
 * their faces', and moss grows back between rounds.
 */
export const TRAIT_RULES: TraitRules = {
  never: {},
  slants: SLANTS_RULE,
  holds: HOLDS_RULE,
  springs: SPRINGS_RULE,
  faceted: FACETED_RULE,
  teleports: TELEPORTS_RULE,
  plated: PLATED_RULE,
  regrows: {},
  bolted: {},
};
