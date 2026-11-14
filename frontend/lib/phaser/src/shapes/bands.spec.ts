import { bandAlong } from "./bands";
import type { Point } from "./shapes";

/** Returns points to a billionth, so two worked out alike but for a rounding are equal. */
function billionths(points: readonly (Point | undefined)[]): readonly Point[] {
  return points.map((point) => ({
    x: Number((point?.x ?? NaN).toFixed(9)) + 0,
    y: Number((point?.y ?? NaN).toFixed(9)) + 0,
  }));
}

describe("bandAlong", () => {
  it("bands a straight line half its width either side, its ends cut square", () => {
    const band = bandAlong(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
      2,
    );

    expect(band).toEqual([
      { x: 0, y: 1 },
      { x: 10, y: 1 },
      { x: 10, y: -1 },
      { x: 0, y: -1 },
    ]);
  });

  it("mitres a corner, inside and out", () => {
    const [, inner, , , outer] = bandAlong(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
      ],
      2,
    );

    expect(billionths([inner, outer])).toEqual([
      { x: 9, y: 1 },
      { x: 11, y: -1 },
    ]);
  });

  it("cuts its first end along a way given, its corners on the line through its first point that way", () => {
    const [left, , , right] = bandAlong(
      [
        { x: 0, y: 0 },
        { x: 3, y: 4 },
      ],
      2,
      { x: 1, y: 0 },
    );

    expect(billionths([left, right])).toEqual([
      { x: -1.25, y: 0 },
      { x: 1.25, y: 0 },
    ]);
  });

  it("cuts its first end the same along a way given backward", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 3, y: 4 },
    ];

    expect(bandAlong(points, 2, { x: -1, y: 0 })).toEqual(
      bandAlong(points, 2, { x: 1, y: 0 }),
    );
  });

  it("refuses to cut its first end along its first leg, where it would never meet its sides", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 0, y: 5 },
    ];

    expect(() => bandAlong(points, 2, { x: 0, y: -1 })).toThrow(RangeError);
  });

  it("refuses a point where the one before it is, which leaves no way along the line", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 0 },
    ];

    expect(() => bandAlong(points, 2)).toThrow(RangeError);
  });

  it("refuses a corner that turns all the way back, which has no mitre", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 0, y: 0 },
    ];

    expect(() => bandAlong(points, 2)).toThrow(RangeError);
  });

  it.each([0, 1])("refuses a line of %i points", (count) => {
    const points = Array.from({ length: count }, () => ({ x: 0, y: 0 }));

    expect(() => bandAlong(points, 2)).toThrow(RangeError);
  });
});
