// The careless player a wall game's levels must each be cleared by often
// enough, so no level is beatable only by a line nobody would find. Its
// floors are held over seeds in every browser's arithmetic as the
// certificates are, so this is held as the rules are (eslint.config.js), to
// their fence and their exact arithmetic.

import { createRandom } from "@fz/core/random";
import { lowestNeededRow } from "../rules/wall";
import type {
  Line,
  LinePlay,
  LinePlayed,
  PlayedRound,
  WallStart,
} from "./solver";

/** How many shots the careless player looks at each round, drawn at random, before it plays the best. */
export const CARELESS_LOOKS = 16;

/** The most rounds the careless player plays a level for: no wall stands that long. */
export const CARELESS_ROUNDS = 150;

/** Describes how the careless player played a level, with the line it played. */
export interface PlayedCarelessly<C> extends LinePlayed {
  /** The shot of each round it played. */
  readonly line: Line<C>;
}

/** Describes a round the careless player looked at: its shot, and the round it plays. */
interface Look<T, C> {
  readonly shot: C;
  readonly round: PlayedRound<T>;
}

/**
 * Returns how the careless player plays a level as its game plays it, from
 * a seed: each round it looks at {@link CARELESS_LOOKS} shots, each drawn
 * from the seed over every shot the game gives, and plays the one that
 * leaves the wall best by the game's `score()`, the first of the best where
 * they tie, till the level is cleared or lost.
 */
export function playCarelessly<K extends string, T extends WallStart<K>, C>(
  play: LinePlay<K, T, C>,
  seed: number,
): PlayedCarelessly<C> {
  const shots = play.shots.flat();
  const random = createRandom(seed);
  const line: C[] = [];
  let start = play.opening;
  let jumps = 0;
  let leastRow = Number.POSITIVE_INFINITY;
  for (let rounds = 1; rounds <= CARELESS_ROUNDS; rounds++) {
    const { shot, round } = bestLooked(play, shots, start, rounds, random);
    const { outcome, next } = round;
    line.push(shot);
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

/** Returns the best of the rounds the careless player looks at from where a round starts, by the game's measure. */
function bestLooked<K extends string, T extends WallStart<K>, C>(
  play: LinePlay<K, T, C>,
  shots: readonly C[],
  start: T,
  rounds: number,
  random: () => number,
): Look<T, C> {
  let best = lookedAt(play, shots, start, random);
  let bestScore = play.score(best.round, rounds);
  for (let look = 1; look < CARELESS_LOOKS; look++) {
    const looked = lookedAt(play, shots, start, random);
    const score = play.score(looked.round, rounds);
    if (score > bestScore) {
      best = looked;
      bestScore = score;
    }
  }
  return best;
}

/** Returns a look at the round a shot drawn at random plays from where a round starts: one draw over every shot. */
function lookedAt<K extends string, T extends WallStart<K>, C>(
  play: LinePlay<K, T, C>,
  shots: readonly C[],
  start: T,
  random: () => number,
): Look<T, C> {
  // A game's play gives one shot at least, so a draw always finds one.
  const shot = shots[Math.floor(random() * shots.length)]!;
  return { shot, round: play.play(start, shot) };
}
