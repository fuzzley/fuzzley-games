import {
  type ArtFrame,
  type DrawCommand,
  type Point,
  circle,
  line,
  polygon,
  polyline,
  rect,
  ring,
  roundRect,
} from "@fz/phaser/shapes";
import { distanceToEdge, edgeOf, reachOf, within } from "./art_frames";

/** The style the specs draw lines in. */
const PEN = { color: 0, width: 2 };

/** A square 10 across, its corner at the origin. */
const SQUARE: readonly Point[] = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 10 },
  { x: 0, y: 10 },
];

/** An L, the square less its top right quarter. */
const ELL: readonly Point[] = [
  { x: 0, y: 0 },
  { x: 5, y: 0 },
  { x: 5, y: 5 },
  { x: 10, y: 5 },
  { x: 10, y: 10 },
  { x: 0, y: 10 },
];

/** Returns how many points there are, and the least and most any lies from (5, 5). */
function reachesOf(points: readonly Point[]): number[] {
  const reaches = points.map(({ x, y }) => Math.hypot(x - 5, y - 5));
  return [reaches.length, Math.min(...reaches), Math.max(...reaches)];
}

/** Returns a frame of a command alone, 20 across and down, its middle at (10, 10). */
function frameOf(command: DrawCommand): ArtFrame {
  return { name: "spec", width: 20, height: 20, commands: [command] };
}

/** Returns the least and most x of points, then the least and most y. */
function spanOf(points: readonly Point[]): number[] {
  const xs = points.map(({ x }) => x);
  const ys = points.map(({ y }) => y);
  return [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
}

describe("within", () => {
  it.each([
    ["inside", { x: 3, y: 7 }, SQUARE, true],
    ["on a side", { x: 10, y: 4 }, SQUARE, true],
    ["on a corner", { x: 0, y: 0 }, SQUARE, true],
    ["outside", { x: 11, y: 4 }, SQUARE, false],
    ["in an L's notch", { x: 8, y: 2 }, ELL, false],
    ["in an L's foot", { x: 8, y: 8 }, ELL, true],
  ])("says whether a point %s lies within", (_, point, shape, inside) => {
    expect(within(point, shape)).toBe(inside);
  });
});

describe("distanceToEdge", () => {
  it.each([
    ["inside, to its nearest side", { x: 3, y: 5 }, 3],
    ["outside, to its nearest side", { x: 15, y: 5 }, 5],
    ["outside, to its nearest corner", { x: 13, y: 14 }, 5],
    ["on its side", { x: 10, y: 5 }, 0],
  ])("measures from a point %s", (_, point, distance) => {
    expect(distanceToEdge(point, SQUARE)).toBeCloseTo(distance);
  });
});

describe("edgeOf", () => {
  it("gives a rectangle's corners", () => {
    expect(
      edgeOf(rect({ x: 1, y: 2, width: 3, height: 4 }, { color: 0 })),
    ).toEqual([
      { x: 1, y: 2 },
      { x: 4, y: 2 },
      { x: 4, y: 6 },
      { x: 1, y: 6 },
    ]);
  });

  it("goes round a circle at its radius, out to every side", () => {
    const edge = edgeOf(circle({ x: 5, y: 5 }, 3, { color: 0 }));

    expect(reachesOf(edge)).toEqual([16, expect.closeTo(3), expect.closeTo(3)]);
    expect(spanOf(edge)).toEqual([
      expect.closeTo(2),
      expect.closeTo(8),
      expect.closeTo(2),
      expect.closeTo(8),
    ]);
  });

  it("goes round a ring at its outer side, out to every side", () => {
    const edge = edgeOf(ring({ x: 5, y: 5 }, 3, PEN));

    expect(reachesOf(edge)).toEqual([16, expect.closeTo(4), expect.closeTo(4)]);
    expect(spanOf(edge)).toEqual([
      expect.closeTo(1),
      expect.closeTo(9),
      expect.closeTo(1),
      expect.closeTo(9),
    ]);
  });

  it("follows a line along both its sides", () => {
    const edge = edgeOf(line({ x: 0, y: 0 }, { x: 10, y: 0 }, PEN));

    expect(edge).toEqual([
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: 10, y: -1 },
      { x: 10, y: 1 },
    ]);
  });

  it("gives a polygon's corners", () => {
    expect(edgeOf(polygon(ELL, { color: 0 }))).toEqual(ELL);
  });

  it("refuses a polyline, whose corners a canvas joins past its width", () => {
    expect(() => edgeOf(polyline(SQUARE, { color: 0, width: 1 }))).toThrow(
      "no polyline",
    );
  });
});

describe("reachOf", () => {
  it("reaches a circle off the middle at its far side", () => {
    expect(
      reachOf(frameOf(circle({ x: 13, y: 14 }, 2, { color: 0 }))),
    ).toBeCloseTo(7);
  });

  it("reaches a ring at its far side, half its width past its radius", () => {
    expect(reachOf(frameOf(ring({ x: 13, y: 14 }, 2, PEN)))).toBeCloseTo(8);
  });

  it("reaches a capsule at its end's arc, short of its box's corner", () => {
    const capsule = roundRect({ x: 4, y: 8, width: 12, height: 4 }, 2, {
      color: 0,
    });

    expect(reachOf(frameOf(capsule))).toBeCloseTo(6);
  });

  it("reaches a line at its far end's corners", () => {
    const stroked = line(
      { x: 10, y: 10 },
      { x: 16, y: 10 },
      {
        color: 0,
        width: 2,
      },
    );

    expect(reachOf(frameOf(stroked))).toBeCloseTo(Math.hypot(6, 1));
  });

  it("refuses a polyline, whose corners a canvas joins past its width", () => {
    expect(() =>
      reachOf(frameOf(polyline(SQUARE, { color: 0, width: 1 }))),
    ).toThrow("no polyline");
  });
});
