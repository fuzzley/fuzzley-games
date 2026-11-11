import {
  circle,
  line,
  polygon,
  polyline,
  rect,
  ring,
  roundRect,
} from "@fz/phaser/shapes";
import {
  billionths,
  distanceToSegment,
  everyScale,
  inBillionths,
  pastRoundRect,
  reachPastRoundRect,
} from "./art_frames";

describe("billionths", () => {
  it("rounds a number to a billionth", () => {
    expect(billionths(1.9999999999999991)).toBe(2);
  });

  it("gives 0 for -0, which a deep equality tells apart", () => {
    expect(Object.is(billionths(-0), 0)).toBe(true);
  });
});

describe("everyScale", () => {
  it.each([
    [1, 24, 105],
    [1.25, 30, 99],
    [2.625, 63, 66],
    [1.1, 27, 102],
  ])(
    "gives every whole unit at %f to one, from the first at 24 CSS pixels or more, %i device pixels, to 128: %i of them",
    (pixelRatio, least, count) => {
      const scales = everyScale(pixelRatio);

      expect([scales[0], scales.at(-1), scales.length]).toEqual([
        { unit: least, pixelRatio },
        { unit: 128, pixelRatio },
        count,
      ]);
    },
  );
});

describe("inBillionths", () => {
  it("rounds each of an area's numbers to a billionth", () => {
    expect(
      inBillionths({
        x: 7.999999999999999,
        y: 1.0000000000000002,
        width: 46.00000000000001,
        height: 9.5,
      }),
    ).toEqual({ x: 8, y: 1, width: 46, height: 9.5 });
  });
});

describe("distanceToSegment", () => {
  const from = { x: 0, y: 0 };
  const to = { x: 10, y: 0 };

  it.each([
    ["beside it", { x: 4, y: 3 }, 3],
    ["past its start", { x: -3, y: 4 }, 5],
    ["past its end", { x: 13, y: -4 }, 5],
  ])("measures to a point %s", (_, point, distance) => {
    expect(distanceToSegment(point, from, to)).toBe(distance);
  });
});

describe("pastRoundRect", () => {
  const area = { x: 0, y: 0, width: 20, height: 10 };

  it.each([
    ["on its straight edge", { x: 10, y: 0 }, 0],
    ["a pixel outside its straight edge", { x: 10, y: -1 }, 1],
    [
      "in the square corner its rounding cuts away",
      { x: 0.5, y: 0.5 },
      Math.hypot(1.5, 1.5) - 2,
    ],
    ["well within it, as far in as its nearest edge", { x: 10, y: 5 }, -5],
  ])("measures a point %s", (_, point, past) => {
    expect(billionths(pastRoundRect(point, area, 2))).toBe(billionths(past));
  });
});

describe("reachPastRoundRect", () => {
  const area = { x: 0, y: 0, width: 20, height: 10 };
  const ink = { color: 1 };
  const pen = { color: 1, width: 2 };

  it.each([
    [
      "a rectangle, by its furthest corner",
      rect({ x: 5, y: 2, width: 17, height: 4 }, ink),
      2,
    ],
    [
      "a rounded rectangle, by its furthest corner's arc",
      roundRect({ x: 5, y: 2, width: 5, height: 9 }, 1, ink),
      1,
    ],
    [
      "a rounded rectangle as round as its corner, lying in it",
      roundRect({ x: 0, y: 0, width: 4, height: 4 }, 2, ink),
      0,
    ],
    [
      "a circle, its radius past its middle",
      circle({ x: 10, y: 1 }, 3, ink),
      2,
    ],
    ["a ring, half its line past its radius", ring({ x: 10, y: 5 }, 5, pen), 1],
    [
      "a line, half its width past its furthest end",
      line({ x: 10, y: 5 }, { x: 10, y: 0 }, pen),
      1,
    ],
    [
      "a polyline, half its width past its furthest point",
      polyline(
        [
          { x: 10, y: 5 },
          { x: 21, y: 5 },
        ],
        pen,
      ),
      2,
    ],
    [
      "a polygon, by its furthest point",
      polygon(
        [
          { x: 10, y: 5 },
          { x: 10, y: 13 },
          { x: 12, y: 5 },
        ],
        ink,
      ),
      3,
    ],
    [
      "a polygon well within it",
      polygon(
        [
          { x: 10, y: 5 },
          { x: 12, y: 5 },
          { x: 11, y: 6 },
        ],
        ink,
      ),
      -4,
    ],
  ])("measures %s", (_, command, past) => {
    expect(billionths(reachPastRoundRect(command, area, 2))).toBe(
      billionths(past),
    );
  });
});
