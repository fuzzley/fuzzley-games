import type { TraitRules } from "../flight/hooks";

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
  slants: {},
  holds: {},
  springs: {},
  faceted: {},
  teleports: {},
  plated: {},
  regrows: {},
  bolted: {},
};
