// The careless player each level must clear often enough
// (docs/archive/brick-fuzz-pop/plan.md, "The guarantee"), @fz/brick-wall's,
// over the game's play of a line, and the floors it is held to. Its floors
// are held over seeds in every browser's arithmetic as the certificates are,
// so this is held as the rules are (eslint.config.js), to their fence and
// their exact arithmetic.

import {
  type PlayedCarelessly,
  playCarelessly,
} from "@fz/brick-wall/testing/careless";
import type { CertifiedShot } from "../rules/levels/certificate";
import type { Level } from "../rules/levels/levels";
import { RULES, type RoundRules } from "../rules/round/round";
import { linePlayOf } from "./solver";

/**
 * How often, in percent, the careless player must clear each level of a
 * set, by the set's id, on every depth: `plan.md`'s floors, which the
 * specs and `yarn report:levels` hold it to.
 */
export const CASUAL_FLOORS: Readonly<Record<string, number>> = {
  "warm-up": 90,
  sparks: 85,
  tricks: 80,
  "thick-walls": 40,
};

/**
 * Returns how the careless player plays a level on a field of a depth from
 * a seed, as `playCarelessly()` plays the game's line: each round the best
 * of sixteen shots drawn from the seed, by `wallScore()`.
 */
export function playCasually(
  level: Level,
  depth: number,
  seed: number,
  rules: RoundRules = RULES,
): PlayedCarelessly<CertifiedShot> {
  return playCarelessly(linePlayOf(level, depth, rules), seed);
}
