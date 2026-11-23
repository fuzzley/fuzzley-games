// The blind player, whose every aim is drawn from a seed with no look at
// what it will do, and the ceiling it is held to (docs/rickashay/design.md,
// "The guarantee", check 4): a level that aims drawn blind clear too often
// plays itself, and its aim means nothing. It plays a level round by round
// as the library's careless player does, one draw in place of its sixteen
// looks, and leaves its seeds to its callers as that player does. It is
// held over seeds in every browser's arithmetic as the careless player is,
// so this is held as the rules are (eslint.config.js), to their fence and
// their exact arithmetic.

import type { Aim } from "@fz/brick-wall/rules/aims";
import { lowestNeededRow } from "@fz/brick-wall/rules/wall";
import { CARELESS_ROUNDS } from "@fz/brick-wall/testing/careless";
import type { Line, LinePlayed } from "@fz/brick-wall/testing/solver";
import { createRandom } from "@fz/core/random";
import type { RoundPlay } from "./line_play";

/** How many games the blind player plays a level on a depth its ceiling is held on. */
export const BLIND_SEEDS = 20;

/** The most times in 100 aims drawn blind may clear a level on any depth. */
export const BLIND_CEILING = 75;

/** Describes how the blind player played a level, with the line it played. */
export interface PlayedBlind extends LinePlayed {
  /** The aim of each round it played. */
  readonly line: Line<Aim>;
}

/**
 * Returns how the blind player plays a level from a seed: each round an
 * aim drawn from the seed over every aim, played without a look at what it
 * does, till the level is cleared or lost, or for the careless player's
 * `CARELESS_ROUNDS` at the most.
 */
export function playBlind(play: RoundPlay, seed: number): PlayedBlind {
  const shots = play.shots.flat();
  const random = createRandom(seed);
  const line: Aim[] = [];
  let start = play.opening;
  let jumps = 0;
  let leastRow = Number.POSITIVE_INFINITY;
  for (let rounds = 1; rounds <= CARELESS_ROUNDS; rounds++) {
    // A game's play gives one shot at least, so a draw always finds one.
    const aim = shots[Math.floor(random() * shots.length)]!;
    const { outcome, next } = play.play(start, aim);
    line.push(aim);
    jumps += outcome.jumped ? 1 : 0;
    if (outcome.result !== "on") {
      const cleared = outcome.result === "cleared";
      return { cleared, rounds, jumps, leastRow, line };
    }
    leastRow = Math.min(leastRow, lowestNeededRow(next.wall, play.wallRules));
    start = next;
  }
  return { cleared: false, rounds: CARELESS_ROUNDS, jumps, leastRow, line };
}

/**
 * Returns how many times in 100 the blind player clears a level, over its
 * {@link BLIND_SEEDS} games from a first seed on.
 *
 * A level's own games start from its number times `SEED_STRIDE`, as its
 * careless player's floor games do, which its caller works out: a spec
 * from the library's holders, a script from `@fz/dev/report`.
 */
export function blindClears(play: RoundPlay, firstSeed: number): number {
  let cleared = 0;
  for (let game = 0; game < BLIND_SEEDS; game++) {
    cleared += playBlind(play, firstSeed + game).cleared ? 1 : 0;
  }
  return (cleared * 100) / BLIND_SEEDS;
}
