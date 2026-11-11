import type { TraitRules } from "../flight/hooks";
import { EARTHS_RULE } from "./traits/earths";
import { KICKS_RULE } from "./traits/kicks";
import { NEVER_RULE } from "./traits/never";
import { comesAt } from "./traits/not_until";
import { PLATED_RULE } from "./traits/plated";
import { RECHARGES_RULE } from "./traits/recharges";
import { REGROWS_RULE } from "./traits/regrows";
import { SHELLED_RULE } from "./traits/shelled";
import { SPLITS_RULE } from "./traits/splits";
import { TELEPORTS_RULE } from "./traits/teleports";
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
  recharges: RECHARGES_RULE,
  // The cage.
  frees: comesAt(15),
  kicks: KICKS_RULE,
  splits: SPLITS_RULE,
  teleports: TELEPORTS_RULE,
  plated: PLATED_RULE,
  // The shell brick.
  shelled: SHELLED_RULE,
  // The moss brick.
  regrows: REGROWS_RULE,
};
