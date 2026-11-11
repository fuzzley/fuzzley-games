import type { TraitRules } from "../flight/hooks";
import { EARTHS_RULE } from "./traits/earths";
import { NEVER_RULE } from "./traits/never";
import { comesAt } from "./traits/not_until";
import { REGROWS_RULE } from "./traits/regrows";
import { SHELLED_RULE } from "./traits/shelled";
import { ZAPS_RULE } from "./traits/zaps";

/**
 * What each brick trait does in a flight, typed so a trait without its rule
 * fails to compile.
 *
 * Each trait whose kinds come later throws until its own file plays it,
 * naming the level its first kind comes in at, as `plan.md`'s table of
 * bricks gives it.
 */
export const TRAIT_RULES: TraitRules = {
  never: NEVER_RULE,
  earths: EARTHS_RULE,
  zaps: ZAPS_RULE,
  // Wool.
  recharges: comesAt(14),
  // The cage.
  frees: comesAt(15),
  // The bumper.
  kicks: comesAt(19),
  // The prism.
  splits: comesAt(20),
  // The portal.
  teleports: comesAt(21),
  // The plated brick.
  plated: comesAt(22),
  // The shell brick.
  shelled: SHELLED_RULE,
  // The moss brick.
  regrows: REGROWS_RULE,
};
