import { EASY, EASY_SOLUTION } from "../testing/grid_picture";
import { digitsText, parseDigits, puzzleFrom } from "./puzzle";

const GIVENS = EASY.join("");

describe("parseDigits", () => {
  it("reads 81 characters row by row, a dot as a blank", () => {
    expect(parseDigits(GIVENS)?.slice(0, 9)).toEqual([
      0, 0, 0, 5, 0, 0, 2, 0, 0,
    ]);
  });

  it("reads a 0 as a blank too", () => {
    expect(parseDigits(GIVENS.replaceAll(".", "0"))).toEqual(
      parseDigits(GIVENS),
    );
  });

  it.each([
    ["too short", GIVENS.slice(1)],
    ["another character", `x${GIVENS.slice(1)}`],
  ])("refuses text %s", (_, text) => {
    expect(parseDigits(text)).toBeNull();
  });
});

describe("digitsText", () => {
  it("writes the digits back as they were read", () => {
    expect(digitsText(parseDigits(GIVENS) ?? [])).toBe(GIVENS);
  });
});

describe("puzzleFrom", () => {
  it("solves givens with one solution", () => {
    const puzzle = puzzleFrom(parseDigits(GIVENS) ?? [], "easy");

    expect(digitsText(puzzle?.solution ?? [])).toBe(EASY_SOLUTION.join(""));
  });

  it("keeps the level it is given", () => {
    expect(puzzleFrom(parseDigits(GIVENS) ?? [], "medium")?.level).toBe(
      "medium",
    );
  });

  it("refuses givens with many solutions", () => {
    expect(puzzleFrom(new Array<number>(81).fill(0), "easy")).toBeNull();
  });

  it("refuses givens with none", () => {
    const repeated = parseDigits(`55${GIVENS.slice(2)}`) ?? [];

    expect(puzzleFrom(repeated, "easy")).toBeNull();
  });
});
