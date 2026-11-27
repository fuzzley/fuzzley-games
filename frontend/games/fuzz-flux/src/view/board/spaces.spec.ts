import type { Point } from "@fz/phaser/shapes";
import { type Square, squareOf } from "../../rules/board/cells";
import type { BoardMetrics } from "./metrics";
import { middleOf, squareAt } from "./spaces";

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
