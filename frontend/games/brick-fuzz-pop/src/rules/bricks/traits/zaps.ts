import type { TraitOf } from "../../catalog/bricks";
import type { ZapPattern } from "../../flight/events";
import type { TraitRule } from "../../flight/hooks";
import { notUntil } from "./not_until";

/**
 * The zaps' patterns whose kinds of brick come in later, each with the level
 * that brings in the first: the bomb's blast, the cross zapper's and the X
 * zapper's.
 */
const LATER_PATTERNS = {
  blast: 10,
  cross: 11,
  x: 13,
} as const satisfies Partial<Record<ZapPattern, number>>;

/**
 * A zapper, as it breaks, sets off a zap of its pattern from its cell, which
 * `fly()` lands half a unit later.
 *
 * Only the row and the column are played yet; any other pattern throws.
 */
export const ZAPS_RULE: TraitRule<TraitOf["zaps"]> = {
  broken: (hooks, cell, _ball, { pattern, hits, reach }) => {
    if (pattern !== "row" && pattern !== "column") {
      throw notUntil(`A "${pattern}" zap`, LATER_PATTERNS[pattern]);
    }
    hooks.zap(cell, pattern, hits, reach);
  },
};
