import type { Point } from "@fz/phaser/shapes";
import { billionths } from "../../../testing/art_frames";
import { BODY } from "../design_square";
import { type Coat, coat, strand, strokes } from "./kind_art";

/** A whole coat, as the kinds grow theirs. */
const WHOLE: Coat = { count: 20, reach: 1.2, vary: 0.1, bend: 0.3, seed: 7 };

/** Where no point is. */
const NOWHERE: Point = { x: NaN, y: NaN };

/** Returns a point's angle from the middle, in radians clockwise from the right. */
function angleOf({ x, y }: Point): number {
  return Math.atan2(y, x);
}

/** Returns a point's distance from the middle. */
function radiusOf({ x, y }: Point): number {
  return Math.hypot(x, y);
}

/** Returns how far a point lies round from an angle, in radians, the shorter way, either side. */
function offAngle(point: Point, angle: number): number {
  const off = angleOf(point) - angle;
  return Math.abs(Math.atan2(Math.sin(off), Math.cos(off)));
}

/** Returns a strand's root, its first point. */
function rootOf(points: readonly Point[]): Point {
  return points[0] ?? NOWHERE;
}

/** Returns a strand's tip, its last point. */
function tipOf(points: readonly Point[]): Point {
  return points.at(-1) ?? NOWHERE;
}

describe("strand", () => {
  it("runs from its root at its angle out to its tip, carried round by its bend", () => {
    const points = strand(0.5, 20, 40, 0.25);

    expect({
      root: [radiusOf(rootOf(points)), angleOf(rootOf(points))].map(billionths),
      tip: [radiusOf(tipOf(points)), angleOf(tipOf(points))].map(billionths),
    }).toEqual({ root: [20, 0.5], tip: [40, 0.75] });
  });

  it("bows the way its tip is carried, a curve rather than a line", () => {
    const points = strand(0, 20, 40, 0.5);

    expect(angleOf(points[4] ?? NOWHERE)).toBeGreaterThan(0);
  });
});

describe("strokes", () => {
  it("draws each strand in an ink a width wide, round at its ends and its corners", () => {
    const drawn = strokes(
      [
        [
          { x: 0, y: 0 },
          { x: 4, y: 0 },
          { x: 4, y: 4 },
        ],
      ],
      0x123456,
      2,
    );

    expect(drawn.map(({ kind, color }) => [kind, color])).toEqual([
      ["line", 0x123456],
      ["line", 0x123456],
      ["circle", 0x123456],
      ["circle", 0x123456],
      ["circle", 0x123456],
    ]);
  });
});

describe("coat", () => {
  it("grows its count of strands, every one alike for its seed", () => {
    expect({ count: coat(WHOLE, 0).length, again: coat(WHOLE, 0) }).toEqual({
      count: 20,
      again: coat(WHOLE, 0),
    });
  });

  it("grows its tips within its reach, give or take half its variation, at rest", () => {
    const tips = coat(WHOLE, 0).map((points) => radiusOf(tipOf(points)));

    expect({
      least: Math.min(...tips) >= BODY * 1.15,
      most: Math.max(...tips) <= BODY * 1.25,
    }).toEqual({ least: true, most: true });
  });

  it("stands its strands straight out on end, 22% longer", () => {
    const rest = coat(WHOLE, 0);

    expect(
      coat(WHOLE, 1).map((points, i) => ({
        turned: billionths(offAngle(tipOf(points), angleOf(rootOf(points)))),
        longer: billionths(
          radiusOf(tipOf(points)) / radiusOf(tipOf(rest[i] ?? [])),
        ),
      })),
    ).toEqual(rest.map(() => ({ turned: 0, longer: 1.22 })));
  });

  it("grows a whole coat all the way round, a strand to each step of the turn, give or take a quarter of one", () => {
    const step = (2 * Math.PI) / WHOLE.count;

    expect(
      coat(WHOLE, 0).filter(
        (points, i) => offAngle(rootOf(points), i * step) > step / 4,
      ),
    ).toEqual([]);
  });

  it("grows a coat over an arc, its first strand at the arc's start and its last at its end, give or take a quarter step", () => {
    const strands = coat(
      { ...WHOLE, count: 11, arc: { from: Math.PI, to: 2 * Math.PI } },
      0,
    );
    const quarter = Math.PI / 11 / 4;

    expect({
      first: offAngle(rootOf(strands[0] ?? []), Math.PI) <= quarter,
      last: offAngle(rootOf(strands.at(-1) ?? []), 2 * Math.PI) <= quarter,
    }).toEqual({ first: true, last: true });
  });
});
