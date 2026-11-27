import { boardFrom } from "../../testing/board_picture";
import { MOVE_FIXTURES } from "../../testing/move_fixtures";
import { dasherStrikes } from "./dasher";

/** The moves played by hand whose first blast is a dasher's alone, each with its dasher. */
const DASHERS = [
  ["dasherGoesOff", "dasher-across"],
  ["dasherSetsOffPuffer", "dasher-across"],
  ["cageOpened", "dasher-down"],
  ["sleepyheadRuffled", "dasher-across"],
  ["twoDashers", "two-dashers"],
] as const satisfies readonly (readonly [keyof typeof MOVE_FIXTURES, string])[];

/** A board 5 squares a side, a gap at its middle. */
const BOARD = boardFrom(["rgrgr", "grgrg", "rg_gr", "grgrg", "rgrgr"]);

/** A board 5 squares a side, with no gap. */
const FULL_BOARD = boardFrom(["rgrgr", "grgrg", "rgrgr", "grgrg", "rgrgr"]);

describe("dasherStrikes", () => {
  it("strikes each square of a dasher across's row, a step a square out from it", () => {
    expect(dasherStrikes(BOARD, "dasher-across", 6)).toEqual([
      { square: 6, step: 0 },
      { square: 5, step: 1 },
      { square: 7, step: 1 },
      { square: 8, step: 2 },
      { square: 9, step: 3 },
    ]);
  });

  it("strikes each square of a dasher down's column, a step a square out from it", () => {
    expect(dasherStrikes(BOARD, "dasher-down", 16)).toEqual([
      { square: 16, step: 0 },
      { square: 11, step: 1 },
      { square: 21, step: 1 },
      { square: 6, step: 2 },
      { square: 1, step: 3 },
    ]);
  });

  it("passes over a gap in its line, counting its step", () => {
    expect(dasherStrikes(BOARD, "dasher-across", 10)).toEqual([
      { square: 10, step: 0 },
      { square: 11, step: 1 },
      { square: 13, step: 3 },
      { square: 14, step: 4 },
    ]);
  });

  it("strikes the row and the column of two dashers, the square they cross once", () => {
    expect(dasherStrikes(FULL_BOARD, "two-dashers", 6)).toEqual([
      { square: 6, step: 0 },
      { square: 1, step: 1 },
      { square: 5, step: 1 },
      { square: 7, step: 1 },
      { square: 11, step: 1 },
      { square: 8, step: 2 },
      { square: 16, step: 2 },
      { square: 9, step: 3 },
      { square: 21, step: 3 },
    ]);
  });

  it("strikes 3 rows and 3 columns for a dasher and a puffer, a square two share at the step of the line run first", () => {
    expect(dasherStrikes(FULL_BOARD, "dasher-and-puffer", 12)).toEqual([
      { square: 7, step: 0 },
      { square: 11, step: 0 },
      { square: 12, step: 0 },
      { square: 6, step: 1 },
      { square: 8, step: 1 },
      { square: 13, step: 1 },
      { square: 16, step: 1 },
      { square: 17, step: 1 },
      { square: 18, step: 1 },
      ...[1, 2, 3, 5, 9, 10, 14, 15, 19, 21, 22, 23].map((square) => ({
        square,
        step: 2,
      })),
    ]);
  });

  it("runs no line of a dasher and a puffer past the board's edge", () => {
    const board = boardFrom(["rgr", "grg", "rgr"]);

    expect(dasherStrikes(board, "dasher-and-puffer", 0)).toEqual([
      { square: 0, step: 0 },
      { square: 1, step: 1 },
      { square: 3, step: 1 },
      { square: 4, step: 1 },
      { square: 2, step: 2 },
      { square: 5, step: 2 },
      { square: 6, step: 2 },
      { square: 7, step: 2 },
    ]);
  });

  it.each(DASHERS)(
    "strikes what the sketch's dasher struck, in %s",
    (name, what) => {
      const { picture, record } = MOVE_FIXTURES[name];
      const [blast] = record.waves[0].blasts;

      expect({
        what: blast.what,
        strikes: dasherStrikes(boardFrom(picture), what, blast.square),
      }).toEqual({ what, strikes: blast.strikes });
    },
  );
});
