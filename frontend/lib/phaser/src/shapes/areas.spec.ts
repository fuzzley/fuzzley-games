import {
  dashes,
  frameAround,
  inset,
  middleSquare,
  outlineRoundRect,
  share,
  star,
  within,
} from "./areas";
import {
  type Area,
  type DrawCommand,
  ORIGIN,
  type Point,
  extentOf,
  rect,
  roundRect,
} from "./shapes";

/** An area 40 wide and 20 tall, its corner at (10, 20). */
const AREA: Area = { x: 10, y: 20, width: 40, height: 20 };

/** Returns a number rounded to a thousandth, so specs compare it plainly. */
function thousandth(value: number): number {
  return Math.round(value * 1000) / 1000 + 0;
}

/** Returns points rounded to a thousandth. */
function rounded(points: readonly Point[]): readonly Point[] {
  return points.map(({ x, y }) => ({ x: thousandth(x), y: thousandth(y) }));
}

/** Returns whether a point lies inside a polygon, by how many of its edges a line from it to the right crosses. */
function inside(point: Point, points: readonly Point[]): boolean {
  const crossings = points.filter((from, i) => {
    const to = points[(i + 1) % points.length] ?? from;
    if (from.y > point.y === to.y > point.y) return false;
    const x = from.x + ((point.y - from.y) * (to.x - from.x)) / (to.y - from.y);
    return point.x < x;
  });
  return crossings.length % 2 === 1;
}

/** Returns a polygon's points, and none of any other command. */
function pointsOf(command: DrawCommand): readonly Point[] {
  return command.kind === "polygon" ? command.points : [];
}

/** Returns whether a command is a polygon that covers a point. */
function covers(command: DrawCommand, point: Point): boolean {
  return inside(point, pointsOf(command));
}

/**
 * Returns the area a polygon encloses, by the shoelace formula, which gives it
 * truly only for a polygon whose edges never cross; any other command
 * encloses none.
 */
function areaOf(command: DrawCommand): number {
  const points = pointsOf(command);
  const twice = points.reduce((sum, point, i) => {
    const next = points[(i + 1) % points.length] ?? point;
    return sum + point.x * next.y - next.x * point.y;
  }, 0);
  return Math.abs(twice) / 2;
}

/** Returns the area of a rounded rectangle, its corners' radius given. */
function roundRectArea(width: number, height: number, radius: number): number {
  return width * height - (4 - Math.PI) * radius * radius;
}

/** Returns the area a command reaches over, rounded to a thousandth. */
function reachOf(command: DrawCommand): Area {
  const { x, y, width, height } = extentOf(command);
  return {
    x: thousandth(x),
    y: thousandth(y),
    width: thousandth(width),
    height: thousandth(height),
  };
}

describe("the areas", () => {
  it("place points at shares of an area across and down", () => {
    expect(
      within(AREA, [
        [0, 0],
        [0.5, 1],
        [1, 0.25],
      ]),
    ).toEqual([
      { x: 10, y: 20 },
      { x: 30, y: 40 },
      { x: 50, y: 25 },
    ]);
  });

  it("take the part of an area that shares of it give", () => {
    expect(share(AREA, 0.25, 0.5, 0.5, 0.25)).toEqual({
      x: 20,
      y: 30,
      width: 20,
      height: 5,
    });
  });

  it.each([
    [2, { x: 12, y: 22, width: 36, height: 16 }],
    [-1, { x: 9, y: 19, width: 42, height: 22 }],
  ])("inset an area by %f on each side", (by, area) => {
    expect(inset(AREA, by)).toEqual(area);
  });

  it("lay a square of a side in the middle of an area", () => {
    expect(middleSquare(AREA, 10)).toEqual({
      x: 25,
      y: 25,
      width: 10,
      height: 10,
    });
  });
});

describe("frameAround", () => {
  it("frames the inside of an area in four bars, its line's width thick", () => {
    const style = { color: 7, width: 2 };

    expect(frameAround({ x: 1, y: 2, width: 10, height: 6 }, style)).toEqual([
      rect({ x: 1, y: 2, width: 10, height: 2 }, style),
      rect({ x: 1, y: 6, width: 10, height: 2 }, style),
      rect({ x: 1, y: 2, width: 2, height: 6 }, style),
      rect({ x: 9, y: 2, width: 2, height: 6 }, style),
    ]);
  });
});

describe("outlineRoundRect", () => {
  // The edge runs 10 to 50 across and 20 to 40 down, its corners about
  // (16, 26), (44, 26), (44, 34) and (16, 34): the band reaches 2 either side
  // of it, its outer corners 8 round and its inner ones 4.
  const STYLE = { color: 7, width: 4 };
  const outline = outlineRoundRect(AREA, 6, STYLE);

  it("draws a band in one polygon in its line's color, reaching half the line past the area", () => {
    expect({
      kind: outline.kind,
      color: outline.color,
      reach: reachOf(outline),
    }).toEqual({
      kind: "polygon",
      color: 7,
      reach: { x: 8, y: 18, width: 44, height: 24 },
    });
  });

  it("joins its edges across the band, its points running from the top of the outer edge's left side round to the inner edge's", () => {
    const points = pointsOf(outline);

    expect(rounded([...points.slice(0, 1), ...points.slice(-1)])).toEqual([
      { x: 8, y: 26 },
      { x: 12, y: 26 },
    ]);
  });

  it.each<[string, Point, boolean]>([
    ["on the top edge", { x: 30, y: 19 }, true],
    ["above the top edge's line", { x: 30, y: 17.5 }, false],
    ["below the top edge's line", { x: 30, y: 22.5 }, false],
    ["on the bottom edge", { x: 30, y: 41 }, true],
    ["below the bottom edge's line", { x: 30, y: 42.5 }, false],
    ["above the bottom edge's line", { x: 30, y: 37.5 }, false],
    ["on the left edge", { x: 9, y: 28 }, true],
    ["left of the left edge's line", { x: 7.5, y: 28 }, false],
    ["right of the left edge's line", { x: 12.5, y: 28 }, false],
    ["on the right edge", { x: 51, y: 32 }, true],
    ["right of the right edge's line", { x: 52.5, y: 32 }, false],
    ["left of the right edge's line", { x: 47.5, y: 32 }, false],
    ["on the top left corner", { x: 12.8, y: 22.8 }, true],
    ["past the top left corner's outer round", { x: 10, y: 20 }, false],
    ["within the top left corner's inner round", { x: 13.5, y: 23.5 }, false],
    ["on the bottom right corner", { x: 47.2, y: 37.2 }, true],
    ["past the bottom right corner's outer round", { x: 50, y: 40 }, false],
  ])("covers a point %s: %s", (_, point, covered) => {
    expect(covers(outline, point)).toBe(covered);
  });

  it("fills the band once, the outer rounded rectangle less the inner", () => {
    const band = roundRectArea(44, 24, 8) - roundRectArea(36, 16, 4);

    // Short of the band only by the arcs' chords, 0.6 of it.
    expect(Math.abs(areaOf(outline) - band)).toBeLessThan(1);
  });

  it.each<[string, Point, boolean]>([
    ["on its round left end", { x: 0, y: 8 }, true],
    ["past its round left end", { x: -0.8, y: 7.5 }, false],
    ["within its round left end", { x: 2, y: 8 }, false],
    ["on its top edge", { x: 20, y: -0.5 }, true],
    ["below its top edge's line", { x: 20, y: 1.5 }, false],
  ])(
    "outlines a pill, its sides all corner, covering a point %s: %s",
    (_, point, covered) => {
      const pill = outlineRoundRect({ x: 0, y: 0, width: 40, height: 20 }, 10, {
        color: 7,
        width: 2,
      });

      expect(covers(pill, point)).toBe(covered);
    },
  );

  it.each<[string, Point, boolean]>([
    ["within the line at the corner", { x: 1.8, y: 1.8 }, true],
    ["just inside the hole's square corner", { x: 2.2, y: 2.2 }, false],
  ])(
    "leaves a square hole where the radius is less than half the line, covering a point %s: %s",
    (_, point, covered) => {
      const square = outlineRoundRect(
        { x: 0, y: 0, width: 20, height: 10 },
        1,
        STYLE,
      );

      expect(covers(square, point)).toBe(covered);
    },
  );

  it.each<[string, Point, boolean]>([
    ["just inside the outer corner", { x: 8.3, y: 18.3 }, true],
    ["just inside the hole's corner", { x: 12.3, y: 22.3 }, false],
  ])(
    "squares its corners where the radius is nothing, as a mitred join does, covering a point %s: %s",
    (_, point, covered) => {
      expect(covers(outlineRoundRect(AREA, 0, STYLE), point)).toBe(covered);
    },
  );

  it("fills the rounded rectangle it reaches over where its line is as wide as the area's shorter side", () => {
    const filled = outlineRoundRect(
      { x: 0, y: 0, width: 10, height: 4 },
      1,
      STYLE,
    );

    expect(filled).toEqual(
      roundRect({ x: -2, y: -2, width: 14, height: 8 }, 3, STYLE),
    );
  });

  it("leaves a hole where its line is narrower than the area's shorter side", () => {
    const thin = outlineRoundRect({ x: 0, y: 0, width: 10, height: 4 }, 1, {
      color: 7,
      width: 3.9,
    });

    expect(thin.kind).toBe("polygon");
  });

  it.each([
    [99, 10],
    [-3, 0],
  ])(
    "rounds its corners by a radius of %f as a rounded rectangle does, as by %f",
    (radius, clamped) => {
      expect(outlineRoundRect(AREA, radius, STYLE)).toEqual(
        outlineRoundRect(AREA, clamped, STYLE),
      );
    },
  );
});

describe("star", () => {
  it("gives a star's points about its middle, its first straight up, its outer and inner points in turn", () => {
    expect(rounded(star({ x: 10, y: 10 }, 2, 1, 4))).toEqual([
      { x: 10, y: 8 },
      { x: 10.707, y: 9.293 },
      { x: 12, y: 10 },
      { x: 10.707, y: 10.707 },
      { x: 10, y: 12 },
      { x: 9.293, y: 10.707 },
      { x: 8, y: 10 },
      { x: 9.293, y: 9.293 },
    ]);
  });
});

describe("dashes", () => {
  it("dashes a line as many times as a dash fits a gap apart, a gap clear of each end, the room left shared between them", () => {
    // A line 100 long takes four dashes of 14, 8 apart, in 80, and 10 of it
    // is left at each end.
    expect(dashes({ x: 0, y: 5 }, { x: 100, y: 5 }, 14, 8)).toEqual([
      { from: { x: 10, y: 5 }, to: { x: 24, y: 5 } },
      { from: { x: 32, y: 5 }, to: { x: 46, y: 5 } },
      { from: { x: 54, y: 5 }, to: { x: 68, y: 5 } },
      { from: { x: 76, y: 5 }, to: { x: 90, y: 5 } },
    ]);
  });

  it("dashes a slanted line along it", () => {
    // A line 50 long takes three dashes of 10, 5 apart, in 40, from 5 along it.
    expect(dashes(ORIGIN, { x: 30, y: 40 }, 10, 5)).toEqual([
      { from: { x: 3, y: 4 }, to: { x: 9, y: 12 } },
      { from: { x: 12, y: 16 }, to: { x: 18, y: 24 } },
      { from: { x: 21, y: 28 }, to: { x: 27, y: 36 } },
    ]);
  });

  it("dashes a line from its end back to its start", () => {
    expect(dashes({ x: 22, y: 0 }, ORIGIN, 14, 4)).toEqual([
      { from: { x: 18, y: 0 }, to: { x: 4, y: 0 } },
    ]);
  });

  it.each<[string, Point, number, number]>([
    [
      "a line shorter than a dash and a gap at each end",
      { x: 21, y: 0 },
      14,
      4,
    ],
    ["a dash of no length", { x: 100, y: 0 }, 0, 4],
    ["a line of no length", ORIGIN, 1, 0],
  ])("draws none on %s", (_, to, dash, gap) => {
    expect(dashes(ORIGIN, to, dash, gap)).toEqual([]);
  });

  it("takes a gap below nothing as none, the dashes end to end", () => {
    expect(dashes(ORIGIN, { x: 30, y: 0 }, 10, -5)).toEqual([
      { from: { x: 0, y: 0 }, to: { x: 10, y: 0 } },
      { from: { x: 10, y: 0 }, to: { x: 20, y: 0 } },
      { from: { x: 20, y: 0 }, to: { x: 30, y: 0 } },
    ]);
  });
});
