import { BANK, deal } from "./deal";
import { LEVELS } from "./difficulty";
import { grade } from "./generate";
import { countSolutions } from "./solver";

describe("deal", () => {
  it("deals a puzzle at the level asked", () => {
    const puzzle = deal("medium", 7);

    expect([puzzle.level, grade(puzzle.givens)]).toEqual(["medium", "medium"]);
  });

  it("deals givens with one solution, and that solution", () => {
    const puzzle = deal("hard", 3);

    expect(countSolutions(puzzle.givens, 2)).toBe(1);
    expect(
      puzzle.givens.every(
        (digit, i) => digit === 0 || digit === puzzle.solution[i],
      ),
    ).toBe(true);
  });

  it("deals the same puzzle from the same seed", () => {
    expect(deal("expert", 11)).toEqual(deal("expert", 11));
  });

  it("deals different-looking puzzles from different seeds", () => {
    expect(deal("easy", 1).givens).not.toEqual(deal("easy", 2).givens);
  });

  it("refuses a bank with nothing at the level", () => {
    expect(() => deal("easy", 1, { ...BANK, easy: [] })).toThrow(
      "The easy bank can't deal",
    );
  });

  it("refuses a bank whose puzzle has many solutions", () => {
    const blank = ".".repeat(81);

    expect(() => deal("easy", 1, { ...BANK, easy: [blank] })).toThrow(
      `The easy bank can't deal "${blank}".`,
    );
  });
});

describe("BANK", () => {
  it.each(LEVELS)("holds puzzles for %s", (level) => {
    expect(BANK[level].length).toBeGreaterThan(0);
  });
});
