import { CELLS, at } from "./cells";
import { LEVEL_INFO, type Level, allows, levelOf } from "./difficulty";
import { hardest, solveByLogic } from "./logic";
import { createRandom, shuffled } from "./random";
import { solveRandomly } from "./solver";

/**
 * Returns the level logic grades a board at, by the hardest technique its
 * solution needs, or null if logic can't solve it or it has nothing to fill.
 */
export function grade(digits: readonly number[]): Level | null {
  const { steps, solved } = solveByLogic(digits);
  const technique = hardest(steps);
  return solved && technique ? levelOf(technique) : null;
}

/**
 * Returns the givens of a puzzle at a level, made from a seed, or null when
 * the seed's grid comes out easier than asked. The same seed always makes
 * the same puzzle.
 *
 * It fills a grid at random, then takes givens away in pairs that mirror
 * each other through the center, keeping a pair away only while logic at
 * the level still solves what is left and the level's fewest givens remain.
 */
export function generate(level: Level, seed: number): number[] | null {
  const random = createRandom(seed);
  const givens = solveRandomly(new Array<number>(CELLS).fill(0), random) ?? [];
  const pairs = shuffled(
    Array.from({ length: (CELLS + 1) / 2 }, (_, i) => i),
    random,
  );
  let count = CELLS;
  for (const i of pairs) {
    const mirror = CELLS - 1 - i;
    const taken = i === mirror ? 1 : 2;
    if (count - taken < LEVEL_INFO[level].fewest) continue;
    const kept = [at(givens, i), at(givens, mirror)] as const;
    givens[i] = 0;
    givens[mirror] = 0;
    if (solveByLogic(givens, (technique) => allows(level, technique)).solved) {
      count -= taken;
    } else {
      [givens[i], givens[mirror]] = kept;
    }
  }
  return grade(givens) === level ? givens : null;
}
