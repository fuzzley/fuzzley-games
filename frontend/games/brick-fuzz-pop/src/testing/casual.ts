// The careless player each level must clear often enough
// (docs/brick-fuzz-pop/plan.md, "The guarantee"), so no level is beatable
// only by a line nobody would find. Its floors are held over seeds in every
// browser's arithmetic as the certificates are, so it is held as the rules
// are (eslint.config.js), to their fence and their exact arithmetic.

import { createRandom } from "@fz/core/random";
import { shotOf } from "../rules/levels/certificate";
import { type Level, levelStart } from "../rules/levels/level";
import {
  RULES,
  type Round,
  type RoundRules,
  type RoundStart,
  playRound,
} from "../rules/round/round";
import { AIM_COUNT, MOST_CHARGE } from "../rules/tuning";
import { lowestNeededRow } from "../rules/wall/lower";
import type { LinePlayed } from "./solver";
import { wallScore } from "./wall_score";

/** How many shots the careless player looks at each round, drawn at random, before it plays the best. */
export const CASUAL_LOOKS = 16;

/** The most rounds the careless player plays a level for: no wall stands that long. */
export const CASUAL_ROUNDS = 150;

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

/** How many charges a shot can take. */
const CHARGE_COUNT = MOST_CHARGE + 1;

/** How many shots a round can take: every aim at every charge. */
const SHOTS = AIM_COUNT * CHARGE_COUNT;

/**
 * Returns how the careless player plays a level on a field of a depth from
 * a seed: each round it looks at {@link CASUAL_LOOKS} shots drawn from the
 * seed and plays the one that leaves the wall best (`wallScore()`), the
 * first of the best where they tie, till the level is cleared or lost.
 */
export function playCasually(
  level: Level,
  depth: number,
  seed: number,
  rules: RoundRules = RULES,
): LinePlayed {
  const random = createRandom(seed);
  let start = levelStart(level, depth);
  let jumps = 0;
  let leastRow = Number.POSITIVE_INFINITY;
  for (let rounds = 1; rounds <= CASUAL_ROUNDS; rounds++) {
    const { outcome, next } = bestLooked(level, start, rounds, random, rules);
    jumps += outcome.jumped ? 1 : 0;
    if (outcome.result !== "on") {
      return { cleared: outcome.result === "cleared", rounds, jumps, leastRow };
    }
    leastRow = Math.min(leastRow, lowestNeededRow(next.wall));
    start = next;
  }
  return { cleared: false, rounds: CASUAL_ROUNDS, jumps, leastRow };
}

/** Returns the best of the rounds the careless player looks at from where a round starts, by their measure. */
function bestLooked(
  level: Level,
  start: RoundStart,
  rounds: number,
  random: () => number,
  rules: RoundRules,
): Round {
  let best = lookedAt(level, start, random, rules);
  let bestScore = wallScore(best, rounds);
  for (let look = 1; look < CASUAL_LOOKS; look++) {
    const round = lookedAt(level, start, random, rules);
    const score = wallScore(round, rounds);
    if (score > bestScore) {
      best = round;
      bestScore = score;
    }
  }
  return best;
}

/** Returns the round a shot drawn at random plays from where a round starts: an aim, then a charge, from one draw over every shot. */
function lookedAt(
  level: Level,
  start: RoundStart,
  random: () => number,
  rules: RoundRules,
): Round {
  const drawn = Math.floor(random() * SHOTS);
  const shot = shotOf([Math.floor(drawn / CHARGE_COUNT), drawn % CHARGE_COUNT]);
  return playRound(start, shot, level.boon, rules);
}
