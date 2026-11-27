import {
  type DrawCommand,
  circle,
  line,
  polygon,
  polyline,
  rect,
  ring,
  roundRect,
} from "@fz/phaser/shapes";
import { type Grid, coverageOf, shareApart } from "./coverage";

/** A grid of 10 by 10 points a pixel apart, from the middle of the top left pixel of a drawing 10 pixels square. */
const GRID: Grid = { from: { x: 0.5, y: 0.5 }, step: 1, across: 10, down: 10 };

/** Returns the rows of a drawing's coverage on the grid, a "#" for each point covered and a "." for each not. */
function rowsOf(...commands: readonly DrawCommand[]): readonly string[] {
  const covered = coverageOf(commands, GRID);
  return Array.from({ length: GRID.down }, (_, row) =>
    Array.from(covered.slice(row * GRID.across, (row + 1) * GRID.across))
      .map((point) => (point === 1 ? "#" : "."))
      .join(""),
  );
}

describe("coverageOf", () => {
  it("covers a rectangle's points, whatever its color and alpha", () => {
    expect(
      rowsOf(
        rect({ x: 2, y: 3, width: 4, height: 2 }, { color: 9, alpha: 0.1 }),
      ),
    ).toEqual([
      "..........",
      "..........",
      "..........",
      "..####....",
      "..####....",
      "..........",
      "..........",
      "..........",
      "..........",
      "..........",
    ]);
  });

  it("leaves out the corners a rounded rectangle rounds off", () => {
    expect(
      rowsOf(roundRect({ x: 0, y: 0, width: 10, height: 10 }, 5, { color: 0 })),
    ).toEqual([
      "...####...",
      ".########.",
      ".########.",
      "##########",
      "##########",
      "##########",
      "##########",
      ".########.",
      ".########.",
      "...####...",
    ]);
  });

  it("covers a circle's disc, and a ring's band alone", () => {
    expect({
      circle: rowsOf(circle({ x: 5, y: 5 }, 2, { color: 0 })),
      ring: rowsOf(ring({ x: 5, y: 5 }, 3, { color: 0, width: 1 })),
    }).toEqual({
      circle: [
        "..........",
        "..........",
        "..........",
        "....##....",
        "...####...",
        "...####...",
        "....##....",
        "..........",
        "..........",
        "..........",
      ],
      ring: [
        "..........",
        "..........",
        "...####...",
        "..#....#..",
        "..#....#..",
        "..#....#..",
        "..#....#..",
        "...####...",
        "..........",
        "..........",
      ],
    });
  });

  it("covers a line its width wide, its ends cut straight across, and nothing for a line of no length", () => {
    expect(
      rowsOf(
        line({ x: 2, y: 5 }, { x: 8, y: 5 }, { color: 0, width: 2 }),
        line({ x: 1, y: 1 }, { x: 1, y: 1 }, { color: 0, width: 2 }),
      ),
    ).toEqual([
      "..........",
      "..........",
      "..........",
      "..........",
      "..######..",
      "..######..",
      "..........",
      "..........",
      "..........",
      "..........",
    ]);
  });

  it("covers each leg of a polyline", () => {
    expect(
      rowsOf(
        polyline(
          [
            { x: 1, y: 1.5 },
            { x: 8.5, y: 1.5 },
            { x: 8.5, y: 9 },
          ],
          { color: 0, width: 1 },
        ),
      ),
    ).toEqual([
      "..........",
      ".########.",
      "........#.",
      "........#.",
      "........#.",
      "........#.",
      "........#.",
      "........#.",
      "........#.",
      "..........",
    ]);
  });

  it("covers the inside of a polygon, a hollow in its outline left out", () => {
    expect(
      rowsOf(
        polygon(
          [
            { x: 1, y: 1 },
            { x: 9, y: 1 },
            { x: 9, y: 9 },
            { x: 5, y: 4 },
            { x: 1, y: 9 },
          ],
          { color: 0 },
        ),
      ),
    ).toEqual([
      "..........",
      ".########.",
      ".########.",
      ".########.",
      ".########.",
      ".###..###.",
      ".##....##.",
      ".#......#.",
      "..........",
      "..........",
    ]);
  });

  it("covers nothing of a shape off the grid", () => {
    expect(
      coverageOf([circle({ x: -20, y: 40 }, 3, { color: 0 })], GRID).every(
        (point) => point === 0,
      ),
    ).toBe(true);
  });
});

describe("shareApart", () => {
  it.each([
    ["alike", [1, 1, 0, 0], [1, 1, 0, 0], 0],
    ["sharing none", [1, 1, 0, 0], [0, 0, 1, 1], 1],
    ["sharing one of three", [1, 1, 0, 0], [0, 1, 1, 0], 2 / 3],
    ["both empty", [0, 0, 0, 0], [0, 0, 0, 0], 0],
  ])("parts two coverages %s by %f", (_, one, other, share) => {
    expect(shareApart(Uint8Array.from(one), Uint8Array.from(other))).toBe(
      share,
    );
  });
});
