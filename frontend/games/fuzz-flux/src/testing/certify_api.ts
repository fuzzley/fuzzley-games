// What tools/certify-deals.mjs certifies the levels' deals through, which
// it loads through Vite (docs/fuzz-flux/design.md, "Deals and the
// guarantee"): on a deal of a level, dealt the level's own moves, the
// proof's line, by the game's own rules. The lines must clear in every
// browser, so this is held as the rules are (eslint.config.js), to their
// fence and their exact arithmetic.

import { levelAt } from "@fz/core/levels";
import { deal } from "../rules/board/deal";
import { ELEMENT_RULES, WIND_RULE } from "../rules/elements/element_rules";
import { LEVELS, type LevelEntry } from "../rules/levels/levels";
import type { Move } from "./play_out";
import { proofOf } from "./proof";

/** Holds what `tools/certify-deals.mjs` certifies the deals through: the levels, and the line that clears a deal of one. */
export interface CertifyApi {
  /** Every level, in the order played. */
  readonly levels: readonly LevelEntry[];
  /**
   * Returns the proof's line on a deal of a level, by the level's number
   * and the deal's seed, dealt the level's own moves, each move in the
   * screen's frame; or null where it finds none.
   */
  readonly lineOf: (level: number, seed: number) => readonly Move[] | null;
}

/** What `tools/certify-deals.mjs` certifies through: the game's levels, each deal dealt and proven by the game's own rules. */
export const CERTIFY_API: CertifyApi = {
  levels: LEVELS,
  lineOf: (level, seed) =>
    proofOf(
      deal(levelAt(LEVELS, level).data, seed, ELEMENT_RULES),
      ELEMENT_RULES,
      WIND_RULE,
    ),
};
