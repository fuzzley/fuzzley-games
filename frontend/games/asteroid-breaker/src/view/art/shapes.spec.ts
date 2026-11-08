import { type DrawCommand, type Point, lineWidth } from "@fz/phaser/shapes";
import { ART_SCALES } from "../../testing/art_frames";
import {
  MOST_BAKED_UNIT,
  MOST_LINE,
  bakedScale,
  dashedRing,
  outlineWidth,
  outward,
} from "./shapes";

/** A square of side 2 about the origin, its points clockwise on the screen. */
const SQUARE: readonly Point[] = [
  { x: -1, y: -1 },
  { x: 1, y: -1 },
  { x: 1, y: 1 },
  { x: -1, y: 1 },
];

/** Returns points rounded to a thousandth, so specs compare them plainly. */
function rounded(points: readonly Point[]): readonly Point[] {
  return points.map(({ x, y }) => ({
    x: Math.round(x * 1000) / 1000 + 0,
    y: Math.round(y * 1000) / 1000 + 0,
  }));
}

describe("bakedScale", () => {
  it("keeps a whole unit no larger than the most baked", () => {
    expect(bakedScale({ unit: 24, pixelRatio: 2 })).toEqual({
      unit: 24,
      pixelRatio: 2,
    });
  });

  it.each([
    [12.7, 1, 12],
    [11.99, 2, 11],
    [10.5, 2.5, 10],
    [29.25, 3, 29],
  ])(
    "rounds a unit of %f device pixels at a pixel ratio of %f down to %i, keeping the ratio",
    (unit, pixelRatio, baked) => {
      expect(bakedScale({ unit, pixelRatio })).toEqual({
        unit: baked,
        pixelRatio,
      });
    },
  );

  it("takes a unit a hair under a whole device pixel, as a fraction's rounding leaves it, for that pixel", () => {
    // 28.999999999999996.
    const unit = 0.29 * 100;

    expect(bakedScale({ unit, pixelRatio: 3 }).unit).toBe(29);
  });

  it("bakes a unit under a device pixel at one", () => {
    expect(bakedScale({ unit: 0.4, pixelRatio: 1 }).unit).toBe(1);
  });

  it.each([32.5, 65])(
    "bakes a unit of %f device pixels, past the most, at the most, keeping the pixel ratio",
    (unit) => {
      expect(bakedScale({ unit, pixelRatio: 2 })).toEqual({
        unit: MOST_BAKED_UNIT,
        pixelRatio: 2,
      });
    },
  );
});

describe("the widths", () => {
  it.each(ART_SCALES)(
    "draw a line and an outline no wider than the most, at a unit of $unit, $pixelRatio to a CSS pixel",
    (scale) => {
      const widest = Math.max(lineWidth(scale), outlineWidth(scale));

      expect(widest / scale.unit).toBeLessThanOrEqual(MOST_LINE);
    },
  );
});

describe("dashedRing", () => {
  /** Returns a dashed ring's straight pieces' ends. */
  function endsOf(commands: readonly DrawCommand[]): readonly Point[] {
    return commands.flatMap((command) =>
      command.kind === "line" ? [command.from, command.to] : [],
    );
  }

  it("dashes a ring as many times as a dash and a gap fit round it, each dash an arc on it", () => {
    // A ring of radius 10 is 62.8 round, so dashes of 5 with gaps of 5 fit six
    // times, and each, half a radian of arc, is drawn in four straight pieces.
    const ends = endsOf(
      dashedRing(10, { dash: 5, gap: 5 }, { color: 9, width: 1 }),
    );

    expect({
      pieces: ends.length / 2,
      first: rounded(ends.slice(0, 1)),
      onRing: ends.every(({ x, y }) => Math.abs(Math.hypot(x, y) - 10) < 1e-9),
    }).toEqual({ pieces: 6 * 4, first: [{ x: 10, y: 0 }], onRing: true });
  });

  it("draws one dash at least, on a ring too small for a dash and a gap", () => {
    // A dash of 5 on a ring of radius 0.5 is ten radians round, in 64 pieces.
    const ends = endsOf(
      dashedRing(0.5, { dash: 5, gap: 5 }, { color: 9, width: 1 }),
    );

    expect(ends.length / 2).toBe(64);
  });
});

describe("outward", () => {
  it("grows a square by a width on every side, its corners out along both", () => {
    expect(rounded(outward(SQUARE, 0.5))).toEqual([
      { x: -1.5, y: -1.5 },
      { x: 1.5, y: -1.5 },
      { x: 1.5, y: 1.5 },
      { x: -1.5, y: 1.5 },
    ]);
  });

  it("grows a square outward whichever way its points run", () => {
    expect(rounded(outward([...SQUARE].reverse(), 0.5))).toEqual([
      { x: -1.5, y: 1.5 },
      { x: 1.5, y: 1.5 },
      { x: 1.5, y: -1.5 },
      { x: -1.5, y: -1.5 },
    ]);
  });

  it("keeps a sharp corner from reaching out more than twice the width", () => {
    const spike = [
      { x: 0, y: -10 },
      { x: 0.2, y: 0 },
      { x: -0.2, y: 0 },
    ];

    expect(rounded(outward(spike, 1).slice(0, 1))).toEqual([{ x: 0, y: -12 }]);
  });
});
