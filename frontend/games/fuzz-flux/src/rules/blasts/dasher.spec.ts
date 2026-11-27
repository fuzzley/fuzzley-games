import { boardFrom } from "../../testing/board_picture";
import { MOVE_FIXTURES } from "../../testing/move_fixtures";
import { dasherStrikes } from "./dasher";

/** The moves played by hand whose first blast is a dasher's alone, each with its dasher. */
const DASHERS = [
  ["dasherGoesOff", "dasher-across"],
  ["dasherSetsOffPuffer", "dasher-across"],
  ["cageOpened", "dasher-down"],
  ["sleepyheadRuffled", "dasher-across"],
] as const satisfies readonly (readonly [keyof typeof MOVE_FIXTURES, string])[];

/** A board 5 squares a side, a gap at its middle. */
const BOARD = boardFrom(["rgrgr", "grgrg", "rg_gr", "grgrg", "rgrgr"]);

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
