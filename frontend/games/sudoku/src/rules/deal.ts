import easy from "./bank/easy.json";
import expert from "./bank/expert.json";
import hard from "./bank/hard.json";
import medium from "./bank/medium.json";
import type { Level } from "./difficulty";
import { type Puzzle, parseDigits, puzzleFrom } from "./puzzle";
import { createRandom } from "./random";
import { randomTransform, transform } from "./transform";

/**
 * The puzzles `yarn generate:puzzles` wrote for each level, as 81 characters
 * each, which `bank.spec.ts` holds to one solution and their level.
 */
export const BANK: Readonly<Record<Level, readonly string[]>> = {
  easy,
  medium,
  hard,
  expert,
};

/**
 * Returns the puzzle a level and a seed deal: one of the level's in the bank,
 * under a transform the seed picks too, so the same seed always deals the
 * same puzzle and two seeds rarely deal two that look alike.
 */
export function deal(
  level: Level,
  seed: number,
  bank: Readonly<Record<Level, readonly string[]>> = BANK,
): Puzzle {
  const random = createRandom(seed);
  const puzzles = bank[level];
  const text = puzzles[Math.floor(random() * puzzles.length)] ?? "";
  const givens = parseDigits(text);
  const puzzle =
    givens && puzzleFrom(transform(givens, randomTransform(random)), level);
  if (!puzzle) throw new Error(`The ${level} bank can't deal "${text}".`);
  return puzzle;
}
