import { BANK } from "./deal";
import { LEVELS, LEVEL_INFO } from "./difficulty";
import { grade } from "./generate";
import { parseDigits } from "./puzzle";
import { countSolutions } from "./solver";

// The bank is written by `yarn generate:puzzles` and committed. These hold
// every puzzle in it to what the game promises, so a bug in the generator,
// the grader or a hand edit can't ship a bad one: the backtracking solver
// checks each has one solution, independently of the grader that made it.
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

  it("keeps the level's fewest givens", () => {
    const fewest = Math.min(
      ...puzzles.map((givens) => givens.filter((digit) => digit !== 0).length),
    );

    expect(fewest).toBeGreaterThanOrEqual(LEVEL_INFO[level].fewest);
  });
});
