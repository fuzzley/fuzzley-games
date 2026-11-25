import type { TraitRules } from "../flight/hooks";
import { FACETED_RULE } from "./traits/faceted";
import { SLANTS_RULE } from "./traits/slants";

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
  holds: {},
  springs: {},
  faceted: FACETED_RULE,
  teleports: {},
  plated: {},
  regrows: {},
  bolted: {},
};
