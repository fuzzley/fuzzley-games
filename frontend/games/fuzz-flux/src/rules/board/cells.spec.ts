import { columnsOf, isOnBoard, neighborsOf, rowsOf } from "./cells";

/** A board 3 squares wide and 2 high, its squares 0 to 5. */
const BOARD = { width: 3, height: 2 };

describe("neighborsOf", () => {
  it("visits a square's neighbors right, left, down and up", () => {
    expect(neighborsOf(4, { width: 3, height: 3 })).toEqual([5, 3, 7, 1]);
  });

  it("leaves out the sides a corner has no square on", () => {
    expect(neighborsOf(5, BOARD)).toEqual([4, 2]);
  });
});

describe("rowsOf", () => {
  it("lists each row from the top, each from the left", () => {
    expect(rowsOf(BOARD)).toEqual([
      [0, 1, 2],
      [3, 4, 5],
    ]);
  });
});

describe("columnsOf", () => {
  it("lists each column from the left, each from the top", () => {
    expect(columnsOf(BOARD)).toEqual([
      [0, 3],
      [1, 4],
      [2, 5],
    ]);
  });
});

describe("isOnBoard", () => {
  it.each([
    { x: 0, y: 0 },
    { x: 2, y: 1 },
  ])("finds %j on the board", (square) => {
    expect(isOnBoard(square, BOARD)).toBe(true);
  });

  it.each([
    { x: -1, y: 0 },
    { x: 3, y: 0 },
    { x: 0, y: -1 },
    { x: 0, y: 2 },
  ])("finds %j off it", (square) => {
    expect(isOnBoard(square, BOARD)).toBe(false);
  });
});
