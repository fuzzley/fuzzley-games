// How the game plays a level's line, which @fz/brick-wall's solver searches
// for the levels' certificates and replays to hold them to their levels
// (docs/archive/brick-fuzz-pop/plan.md, "The guarantee"), and its careless
// player plays. A line found in Node must clear its level in every browser,
// so this is held as the rules are (eslint.config.js), to their fence and
// their exact arithmetic.

import { AIM_COUNT } from "@fz/brick-wall/rules/aims";
import * as solver from "@fz/brick-wall/testing/solver";
import type { BrickKindId } from "../rules/catalog/bricks";
import {
  type CertifiedShot,
  type Line,
  shotOf,
} from "../rules/levels/certificate";
import { type Level, levelStart } from "../rules/levels/levels";
import {
  RULES,
  type RoundRules,
  type RoundStart,
  playRound,
} from "../rules/round/round";
import { type Charge, isCharge } from "../rules/shot";
import { MOST_CHARGE } from "../rules/tuning";
import { WALL_RULES } from "../rules/wall/wall";
import { wallScore } from "./wall_score";

// P3's scripts and specs were built to take a certificate's types from here.
export type { CertifiedShot, Line } from "../rules/levels/certificate";
export {
  type LinePlayed,
  type Solved,
  lineHolds,
} from "@fz/brick-wall/testing/solver";

/** Every charge, in the order the solver tries them. */
const CHARGES: readonly Charge[] = Array.from(
  { length: MOST_CHARGE + 1 },
  (_, charge) => charge,
).filter(isCharge);

/** Every shot a round can take, by aim, as a certificate keeps it: each aim at every charge, the least first. */
const SHOTS: readonly (readonly CertifiedShot[])[] = Array.from(
  { length: AIM_COUNT },
  (_, aim) => CHARGES.map((charge) => [aim, charge] as const),
);

/**
 * Returns how the game plays a level on a field of a depth, through
 * `playRound()`, as the solver searches it and the careless player plays
 * it: its rounds measured by `wallScore()`, and its starts told apart by
 * their walls' hits and height, where the fuzzball waits, the crew and the
 * boon.
 */
export function linePlayOf(
  level: Level,
  depth: number,
  rules: RoundRules = RULES,
): solver.LinePlay<BrickKindId, RoundStart, CertifiedShot> {
  return {
    opening: levelStart(level, depth),
    shots: SHOTS,
    play: (start, shot) => playRound(start, shotOf(shot), level.boon, rules),
    keyOf,
    score: wallScore,
    wallRules: WALL_RULES,
  };
}

/** Returns a line that clears a level on a field of a depth, as `solveLine()` finds one, or null if none does. */
export function solveLevel(
  level: Level,
  depth: number,
  rules: RoundRules = RULES,
): solver.Solved<CertifiedShot> | null {
  return solver.solveLine(linePlayOf(level, depth, rules));
}

/**
 * Returns how a line plays a level on a field of a depth, as `replayLine()`
 * plays it. It throws a `RangeError` for a shot that isn't one.
 */
export function replayLine(
  level: Level,
  depth: number,
  line: Line,
  rules: RoundRules = RULES,
): solver.LinePlayed {
  return solver.replayLine(linePlayOf(level, depth, rules), line);
}

/** Returns what tells one round's start from another: its wall's hits and height, where the fuzzball waits, the crew and the boon. */
function keyOf({ wall, x, crew, boon }: RoundStart): string {
  const hits = wall.bricks.map((brick) => brick?.hits ?? ".").join(",");
  return `${hits}|${String(wall.lowestRow)}|${String(x)}|${crew.friends.join(",")}|${String(boon)}`;
}
