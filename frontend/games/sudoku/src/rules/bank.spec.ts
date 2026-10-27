import { BANK } from "./deal";
import { LEVELS, LEVEL_INFO } from "./difficulty";
import { grade } from "./generate";
import { type Step, agrees, nextPlacement, solveByLogic } from "./logic";
import { parseDigits } from "./puzzle";
import { countSolutions, solve } from "./solver";

/**
 * Returns every step of every hint in a playthrough by hints: each fills in
 * the square it names, until the board is full or logic stalls.
 */
function hintedSteps(givens: readonly number[]): Step[] {
  const digits = [...givens];
  const steps: Step[] = [];
  for (
    let chain = nextPlacement(digits);
    chain;
    chain = nextPlacement(digits)
  ) {
    steps.push(...chain.eliminations, chain.placement);
    digits[chain.placement.index] = chain.placement.digit;
  }
  return steps;
}

// The bank is written by `yarn generate:puzzles` and committed. These hold
// every puzzle in it to what the game promises, so a bug in the generator,
// the grader or a hand edit can't ship a bad one: the backtracking solver
// checks each has one solution, independently of the grader that made it,
// and that every step logic takes on it, grading or hinting, agrees with
// that solution.
describe.each(LEVELS)("the %s bank", (level) => {
  const puzzles = BANK[level].map((text) => parseDigits(text) ?? []);

  it("holds 100 puzzles, none twice", () => {
    expect(new Set(BANK[level]).size).toBe(100);
  });

  it("holds only puzzles of 81 squares", () => {
    expect(puzzles.every((givens) => givens.length === 81)).toBe(true);
  });

  it("holds only puzzles with one solution", () => {
    expect(puzzles.every((givens) => countSolutions(givens, 2) === 1)).toBe(
      true,
    );
  });

  it("holds only puzzles logic grades at its level", () => {
    expect(puzzles.every((givens) => grade(givens) === level)).toBe(true);
  });

  it("holds only puzzles logic grades without a step against the solution", () => {
    const unsound = puzzles.flatMap((givens) => {
      const solution = solve(givens) ?? [];
      return solveByLogic(givens).steps.filter((s) => !agrees(s, solution));
    });

    expect(unsound).toEqual([]);
  });

  it("holds only puzzles whose hints all agree with the solution", () => {
    const unsound = puzzles.flatMap((givens) => {
      const solution = solve(givens) ?? [];
      return hintedSteps(givens).filter((s) => !agrees(s, solution));
    });

    expect(unsound).toEqual([]);
  });

  it("keeps the level's fewest givens", () => {
    const fewest = Math.min(
      ...puzzles.map((givens) => givens.filter((digit) => digit !== 0).length),
    );

    expect(fewest).toBeGreaterThanOrEqual(LEVEL_INFO[level].fewest);
  });
});
