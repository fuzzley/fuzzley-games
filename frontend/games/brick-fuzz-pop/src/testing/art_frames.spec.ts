import {
  billionths,
  distanceToSegment,
  everyScale,
  inBillionths,
  pastRoundRect,
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
    ["well within it", { x: 10, y: 5 }, -2],
  ])("measures a point %s", (_, point, past) => {
    expect(billionths(pastRoundRect(point, area, 2))).toBe(billionths(past));
  });
});
