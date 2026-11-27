import type { Point } from "@fz/phaser/shapes";
import { type Square, squareOf } from "../../rules/board/cells";
import type { BoardMetrics } from "./metrics";
import {
  type BoardShape,
  WAYS,
  areNeighbors,
  isOnBoard,
  middleOf,
  neighborOf,
  sameSquare,
  squareAt,
} from "./spaces";

/** A board 8 squares across and 9 down, each square 50 device pixels, its top left corner at (10, 20). */
const METRICS: BoardMetrics = {
  square: 50,
  x: 10,
  y: 20,
  width: 400,
  height: 450,
  css: { x: 10, y: 20, width: 400, height: 450 },
  panels: null,
};

/** A board 3 squares across and 2 down, a gap at its top right corner. */
const BOARD: BoardShape = {
  width: 3,
  height: 2,
  open: [true, true, false, true, true, true],
};

describe("isOnBoard", () => {
  it.each<[string, Square]>([
    ["its top left corner", { x: 0, y: 0 }],
    ["its bottom right corner", { x: 2, y: 1 }],
  ])("finds %s on the board", (_, square) => {
    expect(isOnBoard(BOARD, square)).toBe(true);
  });

  it.each<[string, Square]>([
    ["a gap", { x: 2, y: 0 }],
    ["a square left of the board", { x: -1, y: 1 }],
    ["a square above it", { x: 1, y: -1 }],
    ["a square right of it, by the next row's first square", { x: 3, y: 0 }],
    ["a square under it", { x: 1, y: 2 }],
  ])("finds %s off the board", (_, square) => {
    expect(isOnBoard(BOARD, square)).toBe(false);
  });
});

describe("neighborOf", () => {
  it("finds a square's neighbor each way on the screen", () => {
    const neighbors = WAYS.map((way) => neighborOf({ x: 4, y: 7 }, way));

    expect(neighbors).toEqual([
      { x: 4, y: 6 },
      { x: 5, y: 7 },
      { x: 4, y: 8 },
      { x: 3, y: 7 },
    ]);
  });

  it("finds a neighbor past the board's edges", () => {
    expect(neighborOf({ x: 0, y: 0 }, "left")).toEqual({ x: -1, y: 0 });
  });
});

describe("sameSquare", () => {
  it.each<[string, Square, boolean]>([
    ["the same square", { x: 2, y: 5 }, true],
    ["another in its row", { x: 3, y: 5 }, false],
    ["another in its column", { x: 2, y: 4 }, false],
  ])("tells %s", (_, other, same) => {
    expect(sameSquare({ x: 2, y: 5 }, other)).toBe(same);
  });
});

describe("areNeighbors", () => {
  it.each<[string, Square, boolean]>([
    ["a neighbor across", { x: 3, y: 5 }, true],
    ["a neighbor down", { x: 2, y: 4 }, true],
    ["the square itself", { x: 2, y: 5 }, false],
    ["a square across a corner", { x: 3, y: 6 }, false],
    ["a square two along", { x: 0, y: 5 }, false],
  ])("tells %s", (_, other, neighbors) => {
    expect(areNeighbors({ x: 2, y: 5 }, other)).toBe(neighbors);
  });
});

describe("squareAt", () => {
  it.each<[string, Point, Square]>([
    ["inside a square", { x: 185, y: 140 }, { x: 3, y: 2 }],
    ["on its top left corner", { x: 160, y: 120 }, { x: 3, y: 2 }],
    [
      "a hair inside its bottom right corner",
      { x: 209.9, y: 169.9 },
      { x: 3, y: 2 },
    ],
    ["on the board's top left corner", { x: 10, y: 20 }, { x: 0, y: 0 }],
    [
      "inside the board's bottom right square",
      { x: 409, y: 469 },
      { x: 7, y: 8 },
    ],
  ])("finds the square under a point %s", (_, point, square) => {
    expect(squareAt(METRICS, point)).toEqual(square);
  });

  it.each<[string, Point]>([
    ["left of the board", { x: 9.9, y: 100 }],
    ["above it", { x: 100, y: 19.9 }],
    ["on its right edge", { x: 410, y: 100 }],
    ["on its bottom edge", { x: 100, y: 470 }],
  ])("finds none under a point %s", (_, point) => {
    expect(squareAt(METRICS, point)).toBeNull();
  });
});

describe("middleOf", () => {
  it("finds a square's middle on the canvas", () => {
    expect(middleOf(METRICS, { x: 3, y: 2 })).toEqual({ x: 185, y: 145 });
  });

  it("finds each square under its own middle", () => {
    const squares = Array.from({ length: 8 * 9 }, (_, i) => squareOf(i, 8));

    const found = squares.map((square) =>
      squareAt(METRICS, middleOf(METRICS, square)),
    );

    expect(found).toEqual(squares);
  });
});
