import type { Box } from "@fz/core/sweep";
import {
  brickBox,
  cellIndex,
  cellMiddleX,
  cellMiddleY,
  columnAt,
  columnOf,
  inGrid,
  rowAt,
  rowOf,
} from "./grid";

describe("the grid's cells", () => {
  it("are numbered row by row, from the top left", () => {
    const index = cellIndex(4, 2);

    expect([index, columnOf(index), rowOf(index)]).toEqual([2 * 13 + 4, 4, 2]);
  });

  it.each([
    [0, 0, true],
    [12, 15, true],
    [-1, 0, false],
    [13, 0, false],
    [0, -1, false],
    [0, 16, false],
  ])("say whether column %i, row %i is in the grid", (column, row, inside) => {
    expect(inGrid(column, row)).toBe(inside);
  });

  // Bricks are 2 wide and 1 tall, from 2 below the top wall.
  it.each([
    [5.9, 2],
    [6, 3],
    [-0.5, -1],
  ])("put x = %f in column %i", (x, column) => {
    expect(columnAt(x)).toBe(column);
  });

  it.each([
    [2.5, 0],
    [3, 1],
    [1.5, -1],
  ])("put y = %f in row %i", (y, row) => {
    expect(rowAt(y)).toBe(row);
  });

  it("put a cell's middle in the middle of its brick", () => {
    const cell = cellIndex(3, 4);

    expect([cellMiddleX(cell), cellMiddleY(cell)]).toEqual([7, 6.5]);
  });
});

describe("brickBox", () => {
  it("writes the box of a cell's brick", () => {
    const box: Box = { left: 0, top: 0, right: 0, bottom: 0 };

    brickBox(3, 4, box);

    expect(box).toEqual({ left: 6, top: 6, right: 8, bottom: 7 });
  });
});
