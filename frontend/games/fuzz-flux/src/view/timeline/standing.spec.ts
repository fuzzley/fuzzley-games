import { boardFrom } from "../../testing/board_picture";
import { gridOf } from "../../testing/shown_board";
import { everyStanding, findStanding, standingOn } from "./standing";

/** A board of a red fuzzball, a square holding nothing, a gap and a brick, numbered 1 and 2. */
const GRID = gridOf(boardFrom(["r ", "_1"]));

describe("findStanding", () => {
  it("finds the piece on a square, at its place", () => {
    expect(findStanding(GRID, 3)).toEqual({
      piece: GRID.squares[3]?.piece,
      at: { x: 1, y: 1 },
    });
  });

  it.each([
    ["a square holding nothing", 1],
    ["a gap", 2],
  ])("finds none on %s", (_, square) => {
    expect(findStanding(GRID, square)).toBeNull();
  });
});

describe("standingOn", () => {
  it("finds the piece on a square, at its place", () => {
    expect(standingOn(GRID, 0)).toEqual({
      piece: GRID.squares[0]?.piece,
      at: { x: 0, y: 0 },
    });
  });

  it("refuses a square with no piece", () => {
    expect(() => standingOn(GRID, 1)).toThrow(
      new RangeError("No piece stands on square 1."),
    );
  });
});

describe("everyStanding", () => {
  it("finds every piece on a board, in the order of its squares", () => {
    expect(everyStanding(GRID).map(({ piece }) => piece.id)).toEqual([1, 2]);
  });
});
