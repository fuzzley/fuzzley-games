import {
  type Box,
  SIDE,
  type Solid,
  brickBox,
  cellIndex,
  columnAt,
  columnOf,
  exposureOf,
  inGrid,
  rowAt,
  rowOf,
} from "./grid";
import { COLUMNS } from "./tuning";

/**
 * Returns which cells stop a ball, from rows of the grid drawn with `#` for
 * a brick: the walls beside it too, and nothing above or below it.
 */
function solidFrom(rows: readonly string[]): Solid {
  return (column, row) =>
    column < 0 || column >= COLUMNS || rows[row]?.[column] === "#";
}

/** Returns the names of the sides an exposure holds. */
function sidesOf(exposure: number): string[] {
  return Object.entries(SIDE)
    .filter(([, bit]) => (exposure & bit) !== 0)
    .map(([name]) => name);
}

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

  it("find the column and row a point lies in, below the bricks' top", () => {
    // Bricks are 2 wide and 1 tall, from 2 below the top wall.
    expect([columnAt(5.9), rowAt(2.5), rowAt(1.5)]).toEqual([2, 0, -1]);
  });
});

describe("brickBox", () => {
  it("writes the box of a cell's brick", () => {
    const box: Box = { left: 0, top: 0, right: 0, bottom: 0 };

    brickBox(3, 4, box);

    expect(box).toEqual({ left: 6, top: 6, right: 8, bottom: 7 });
  });
});

describe("exposureOf", () => {
  it("exposes every face and corner of a brick alone", () => {
    const solid = solidFrom(["", "....#"]);

    expect(sidesOf(exposureOf(solid, 4, 1))).toEqual(Object.keys(SIDE));
  });

  it("makes one face of bricks side by side, with no corner at the seam", () => {
    const solid = solidFrom(["", "....##"]);

    expect(sidesOf(exposureOf(solid, 4, 1))).toEqual([
      "top",
      "bottom",
      "left",
      "topLeft",
      "bottomLeft",
    ]);
  });

  it("hides the face a brick above covers, and its corners", () => {
    const solid = solidFrom(["....#", "....#"]);

    expect(sidesOf(exposureOf(solid, 4, 1))).toEqual([
      "right",
      "bottom",
      "left",
      "bottomRight",
      "bottomLeft",
    ]);
  });

  it("hides the face and corners against a wall", () => {
    const solid = solidFrom(["", "#"]);

    expect(sidesOf(exposureOf(solid, 0, 1))).toEqual([
      "top",
      "right",
      "bottom",
      "topRight",
      "bottomRight",
    ]);
  });

  it("hides a corner a brick across from it touches, keeping both faces", () => {
    const solid = solidFrom(["...#", "....#"]);

    expect(sidesOf(exposureOf(solid, 4, 1))).toEqual([
      "top",
      "right",
      "bottom",
      "left",
      "topRight",
      "bottomRight",
      "bottomLeft",
    ]);
  });

  it("exposes the top of the first row, under the open space", () => {
    const solid = solidFrom(["#"]);

    expect(exposureOf(solid, 0, 0) & SIDE.top).toBe(SIDE.top);
  });
});
