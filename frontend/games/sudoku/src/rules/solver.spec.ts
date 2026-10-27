import { EASY, EASY_SOLUTION } from "../testing/grid_picture";
import { UNITS } from "./cells";
import { digitsText, parseDigits } from "./puzzle";
import { createRandom } from "@fz/core/random";
import { countSolutions, solve, solveRandomly } from "./solver";

const GIVENS = parseDigits(EASY.join("")) ?? [];
const EMPTY = new Array<number>(81).fill(0);

/** Givens with the top row's first digit repeated beside it. */
const REPEATED = parseDigits(`55${EASY.join("").slice(2)}`) ?? [];

/** Returns whether every unit of a full board holds 1 to 9 once each. */
function isSolution(digits: readonly number[]): boolean {
  return UNITS.every(
    (unit) => new Set(unit.cells.map((i) => digits[i])).size === 9,
  );
}

describe("solve", () => {
  it("solves givens with one solution", () => {
    expect(digitsText(solve(GIVENS) ?? [])).toBe(EASY_SOLUTION.join(""));
  });

  it("finds a solution for givens with many", () => {
    expect(isSolution(solve(EMPTY) ?? [])).toBe(true);
  });

  it("finds none for givens that repeat a digit in a unit", () => {
    expect(solve(REPEATED)).toBeNull();
  });
});

describe("countSolutions", () => {
  it("counts one for givens with one solution", () => {
    expect(countSolutions(GIVENS, 2)).toBe(1);
  });

  it("stops counting at the limit", () => {
    expect(countSolutions(EMPTY, 2)).toBe(2);
  });

  it("counts none for givens that repeat a digit", () => {
    expect(countSolutions(REPEATED, 2)).toBe(0);
  });

  it("counts none where the blanks can't be filled", () => {
    // Row 1 gives 1 to 8, and column 9 gives the 9 its last square needs.
    const stuck = [1, 2, 3, 4, 5, 6, 7, 8, 0, ...EMPTY.slice(9)];
    stuck[17] = 9;

    expect(countSolutions(stuck, 2)).toBe(0);
  });
});

describe("solveRandomly", () => {
  it("fills an empty board with a full grid", () => {
    expect(isSolution(solveRandomly(EMPTY, createRandom(1)) ?? [])).toBe(true);
  });

  it("fills the same grid for the same seed", () => {
    expect(solveRandomly(EMPTY, createRandom(9))).toEqual(
      solveRandomly(EMPTY, createRandom(9)),
    );
  });

  it("fills different grids for different seeds", () => {
    expect(solveRandomly(EMPTY, createRandom(1))).not.toEqual(
      solveRandomly(EMPTY, createRandom(2)),
    );
  });

  it("keeps the digits it is given", () => {
    expect(digitsText(solveRandomly(GIVENS, createRandom(1)) ?? [])).toBe(
      EASY_SOLUTION.join(""),
    );
  });

  it("finds none for givens that repeat a digit", () => {
    expect(solveRandomly(REPEATED, createRandom(1))).toBeNull();
  });
});
