import { boardCanvas } from "@fz/brick-wall/testing/canvases";
import {
  type FieldMetrics,
  type FieldShape,
  bandPixels,
  fieldMetrics,
  fieldShape,
} from "@fz/brick-wall/view/field_metrics";
import { SHAPES, SMALLEST, shapesAt } from "@fz/dev/layout";
import type { Viewport } from "@fz/phaser/layout";
import { FLIGHT_RULES, type FlightRules } from "../../rules/tuning";
import {
  type BandSprings,
  SPRINGS_RIGHT_CSS_PX,
  SPRING_GAP_CSS_PX,
  SPRING_PAD_CSS_PX,
  SPRING_UNITS,
  bandSprings,
} from "./springs";

/** Describes a field laid out on a canvas, with the shape it was worked out by. */
interface LaidOut {
  readonly shape: FieldShape;
  readonly metrics: FieldMetrics;
}

/** Returns the field a canvas lays out, by the shape the canvas gives it. */
function laidOut(canvas: Viewport): LaidOut {
  const shape = fieldShape(canvas);
  return { shape, metrics: fieldMetrics(canvas, shape) };
}

/** Returns the springs of a field laid out on a canvas, as many as the rules say a fuzzball holds. */
function springsOn(
  canvas: Viewport,
  rules: Pick<FlightRules, "mostBounces"> = FLIGHT_RULES,
): BandSprings {
  const { shape, metrics } = laidOut(canvas);
  return bandSprings(metrics, shape, rules);
}

/** Returns whether each spring but the first stands a spring's width and a gap right of the one before. */
function evenlySpaced({ size, corners }: BandSprings, gap: number): boolean {
  return corners
    .slice(1)
    .every(({ x }, before) => x - (corners[before]?.x ?? NaN) === size + gap);
}

/** Returns where the last spring's right edge lies, in device pixels. */
function lastRightEdge({ size, corners }: BandSprings): number {
  return (corners.at(-1)?.x ?? NaN) + size;
}

/** Every shape the layout check opens a game at, at 1× and 2×. */
const LAYOUT_SHAPES = [
  ...shapesAt(1, [...SHAPES, SMALLEST]),
  ...shapesAt(2, [...SHAPES, SMALLEST]),
];

describe("bandSprings", () => {
  it("draws three springs, as the rules let a fuzzball hold three floor bounces", () => {
    const { corners } = springsOn(boardCanvas(390, 844));

    expect(corners).toHaveLength(3);
  });

  it("draws as many springs as the rules retuned say a fuzzball holds", () => {
    const { corners } = springsOn(boardCanvas(390, 844), { mostBounces: 5 });

    expect(corners).toHaveLength(5);
  });

  it("narrows springs too many for the band's width till they fit between its margins, side by side", () => {
    const { metrics } = laidOut(boardCanvas(390, 844));
    const margin = SPRINGS_RIGHT_CSS_PX;

    const springs = springsOn(boardCanvas(390, 844), { mostBounces: 20 });

    expect(springs.size).toBeLessThan(22);
    expect(springs.corners[0]?.x).toBeGreaterThanOrEqual(metrics.x + margin);
    expect(lastRightEdge(springs)).toBe(metrics.x + metrics.width - margin);
    expect(evenlySpaced(springs, SPRING_GAP_CSS_PX)).toBe(true);
  });

  it("lays no spring past the field's walls however many the rules retuned say a fuzzball holds", () => {
    const { metrics } = laidOut(boardCanvas(390, 844));

    const { corners, size } = springsOn(boardCanvas(390, 844), {
      mostBounces: 200,
    });

    expect(
      corners.every(
        ({ x }) => x >= metrics.x && x + size <= metrics.x + metrics.width,
      ),
    ).toBe(true);
  });

  it("lays a phone's three springs at the band's right end, as the design draws them", () => {
    // Cells 360 px wide from (15, 48), 680 px deep; a band of 44 px under
    // them. Springs of 0.55 × 40 = 22 px, centered down the band, 4 px
    // apart, the last 8 px in from the right wall at 375.
    const springs = springsOn(boardCanvas(390, 844));

    expect(springs).toEqual({
      size: 22,
      corners: [
        { x: 293, y: 739 },
        { x: 319, y: 739 },
        { x: 345, y: 739 },
      ],
    });
  });

  it("makes a roomy window's springs as tall as its thin band leaves past their padding", () => {
    // A unit of 56 px, a band of 35: 35 − 2 × 3 = 29 px, under 0.55 × 56.
    const { metrics, shape } = laidOut(boardCanvas(1280, 800));

    const { size } = bandSprings(metrics, shape, FLIGHT_RULES);

    expect(bandPixels(shape, metrics.unit)).toBe(35);
    expect(size).toBe(29);
  });

  it("scales the springs, their gaps and their margin with the pixel ratio", () => {
    // A roomy window's unit is 56 px at 1× and 112 at 2×.
    const once = springsOn(boardCanvas(1280, 800));

    const twice = springsOn(boardCanvas(1280, 800, 2));

    expect(twice.size).toBe(2 * once.size);
    expect(twice.corners).toEqual(
      once.corners.map(({ x, y }) => ({ x: 2 * x, y: 2 * y })),
    );
  });

  it("lays the springs out at the unit the field is laid out at, though the room has shrunk since its shape", () => {
    const shape = fieldShape(boardCanvas(390, 844));
    const metrics = fieldMetrics(boardCanvas(300, 844), shape);

    const { size } = bandSprings(metrics, shape, FLIGHT_RULES);

    expect(metrics.unit).toBeLessThan(shape.unit);
    expect(size).toBe(Math.floor(SPRING_UNITS * metrics.unit));
  });

  it("draws no spring wider than nothing in a band too thin to hold one", () => {
    // A hidden board's field: a unit of a device pixel, a band of none.
    const { metrics } = laidOut(boardCanvas(0, 0));

    const { size, corners } = springsOn(boardCanvas(0, 0));

    expect(size).toBe(0);
    expect(
      corners.every(
        ({ x }) => x >= metrics.x && x <= metrics.x + metrics.width,
      ),
    ).toBe(true);
  });

  it.each(LAYOUT_SHAPES)(
    "keeps every spring inside the band, clear of its edges, in the layout check's $name at $viewport.deviceScaleFactor×",
    ({ viewport: { width, height, deviceScaleFactor } }) => {
      const { shape, metrics } = laidOut(
        boardCanvas(width, height, deviceScaleFactor),
      );
      const top = metrics.y + metrics.height;
      const bottom = top + bandPixels(shape, metrics.unit);
      const pad = SPRING_PAD_CSS_PX * deviceScaleFactor;

      const { size, corners } = bandSprings(metrics, shape, FLIGHT_RULES);

      expect(size).toBeGreaterThan(0);
      for (const { y } of corners) {
        expect(y).toBeGreaterThanOrEqual(top + pad);
        expect(y + size).toBeLessThanOrEqual(bottom - pad);
      }
    },
  );

  it.each(LAYOUT_SHAPES)(
    "sets the springs side by side, the last its margin in from the right wall, in the layout check's $name at $viewport.deviceScaleFactor×",
    ({ viewport: { width, height, deviceScaleFactor } }) => {
      const { shape, metrics } = laidOut(
        boardCanvas(width, height, deviceScaleFactor),
      );
      const right =
        metrics.x + metrics.width - SPRINGS_RIGHT_CSS_PX * deviceScaleFactor;

      const springs = bandSprings(metrics, shape, FLIGHT_RULES);

      expect(lastRightEdge(springs)).toBe(right);
      expect(evenlySpaced(springs, SPRING_GAP_CSS_PX * deviceScaleFactor)).toBe(
        true,
      );
    },
  );

  it.each(LAYOUT_SHAPES)(
    "lays every spring on whole device pixels in the layout check's $name at $viewport.deviceScaleFactor×",
    ({ viewport: { width, height, deviceScaleFactor } }) => {
      const { size, corners } = springsOn(
        boardCanvas(width, height, deviceScaleFactor),
      );

      expect(
        [size, ...corners.flatMap(({ x, y }) => [x, y])].every(
          Number.isInteger,
        ),
      ).toBe(true);
    },
  );
});
