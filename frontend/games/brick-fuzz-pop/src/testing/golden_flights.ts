// The golden flights: each round a level's certificate plays on a depth, and
// each of some shots drawn from a seed at the level's opening, hashed with its
// flight, its outcome and where the next round starts, which
// `src/rules/levels/golden/golden.spec.ts` holds the rules to while their code
// moves. `tools/golden-flights.mjs` loads them, so they are held as the rules
// are (eslint.config.js), to their fence and their exact arithmetic.

import { createRandom } from "@fz/core/random";
import { type Line, shotOf } from "../rules/levels/certificate";
import { type Level, levelStart } from "../rules/levels/level";
import { type Round, playRound } from "../rules/round/round";
import type { Shot } from "../rules/shot";
import { AIM_COUNT, MOST_CHARGE } from "../rules/tuning";

/** How many shots are drawn at each level's opening on each depth. */
export const GOLDEN_SHOTS = 50;

/** How many charges a shot can take. */
const CHARGE_COUNT = MOST_CHARGE + 1;

/** How many shots a round can take: every aim at every charge. */
const SHOTS = AIM_COUNT * CHARGE_COUNT;

/** How far apart two levels' seeds stand, so no depth's seed is another level's. */
const LEVEL_STRIDE = 100;

/** FNV-1a's 32-bit offset basis. */
const FNV_OFFSET = 0x811c9dc5;

/**
 * Returns a value written out with each record's keys sorted, so the order
 * code writes a record's keys in never changes it, and each number as the
 * standard writes it, the same in every engine. A key holding `undefined`
 * is left out, as one never written.
 */
export function canonicalText(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalText).join(",")}]`;
  }
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalText(entry)}`);
    return `{${entries.join(",")}}`;
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Returns texts hashed one after another, by 32-bit FNV-1a over their UTF-16
 * code units, as 8 hexadecimal digits.
 *
 * A text changed in one code unit always changes the hash, since each step
 * is a bijection of the 32 bits.
 */
export function hashOf(texts: readonly string[]): string {
  let hash = FNV_OFFSET;
  for (const text of texts) {
    for (let index = 0; index < text.length; index++) {
      hash ^= text.charCodeAt(index);
      // hash × 16777619, FNV's prime, 2^24 + 2^8 + 0x93, in shifts and adds
      // that stay whole numbers under 2^53, cut to 32 bits.
      hash =
        (hash +
          (hash << 1) +
          (hash << 4) +
          (hash << 7) +
          (hash << 8) +
          (hash << 24)) >>>
        0;
    }
  }
  return hash.toString(16).padStart(8, "0");
}

/** Returns the hash of rounds played in turn: each round's flight, outcome and next start. */
export function roundsHash(rounds: readonly Round[]): string {
  return hashOf(
    rounds.map(({ flight, outcome, next }) =>
      canonicalText({ flight, outcome, next }),
    ),
  );
}

/**
 * Returns the rounds a line plays from a level's start on a field of a
 * depth, each from where the last left the next, till the line ends or its
 * level does. It throws a `RangeError` for a shot that isn't one.
 */
export function lineRounds(level: Level, depth: number, line: Line): Round[] {
  const rounds: Round[] = [];
  let start = levelStart(level, depth);
  for (const certified of line) {
    const round = playRound(start, shotOf(certified), level.boon);
    rounds.push(round);
    if (round.outcome.result !== "on") {
      break;
    }
    start = round.next;
  }
  return rounds;
}

/**
 * Returns {@link GOLDEN_SHOTS} shots drawn from a level's number and a
 * depth, each an aim and a charge from one draw over every shot, the same
 * every run.
 */
export function drawnShots(levelNumber: number, depth: number): Shot[] {
  const random = createRandom(levelNumber * LEVEL_STRIDE + depth);
  return Array.from({ length: GOLDEN_SHOTS }, () => {
    const drawn = Math.floor(random() * SHOTS);
    return shotOf([Math.floor(drawn / CHARGE_COUNT), drawn % CHARGE_COUNT]);
  });
}

/** Returns the rounds each of some shots plays from a level's opening on a field of a depth, each on its own. */
export function openingRounds(
  level: Level,
  depth: number,
  shots: readonly Shot[],
): Round[] {
  const opening = levelStart(level, depth);
  return shots.map((shot) => playRound(opening, shot, level.boon));
}
