import { outlineRoundRect, rect } from "@fz/phaser/shapes";
import { billionths } from "../../testing/art_frames";
import { FRAMES } from "./frames";
import {
  bandAlong,
  cellFrame,
  cellOf,
  crispEdge,
  crispOutline,
  detailed,
  diePips,
  itemAt,
} from "./symbols";

describe("detailed", () => {
  it.each([
    [58, 2, false],
    [60, 2, true],
    [62, 2, true],
    [29, 1, false],
    [30, 1, true],
  ])(
    "draws the finest detail at %i device pixels a unit, %i to a CSS pixel: %s",
    (unit, pixelRatio, detail) => {
      expect(detailed({ unit, pixelRatio })).toBe(detail);
    },
  );
});

describe("cellOf", () => {
  it.each([
    [62, 62],
    [62.4, 62],
    [0.4, 1],
  ])(
    "gives a unit of %f device pixels a cell %i pixels square",
    (unit, side) => {
      expect(cellOf({ unit, pixelRatio: 2 })).toEqual({
        x: 0,
        y: 0,
        width: side,
        height: side,
      });
    },
  );
});

describe("cellFrame", () => {
  it("makes a frame the size of a cell, drawn in the cell", () => {
    const frame = cellFrame(
      FRAMES.steel,
      { unit: 40, pixelRatio: 1 },
      (cell) => [rect(cell, { color: 7 })],
    );

    expect(frame).toEqual({
      name: "steel",
      width: 40,
      height: 40,
      commands: [{ kind: "rect", x: 0, y: 0, width: 40, height: 40, color: 7 }],
    });
  });
});

describe("itemAt", () => {
  const frames = [FRAMES.tile(0), FRAMES.tile(1)];

  it("gives the item at a place in a list", () => {
    expect(itemAt(frames, 1)).toBe("tile-1");
  });

  it.each([-1, 2, 0.5])("refuses place %s, which the list hasn't", (at) => {
    expect(() => itemAt(frames, at)).toThrow(RangeError);
  });
});

describe("crispOutline", () => {
  const area = { x: 4, y: 4, width: 20, height: 10 };

  it("outlines an area as outlineRoundRect() does where the line is an even number of pixels wide", () => {
    expect(crispOutline(area, 3, { color: 5, width: 2 })).toEqual(
      outlineRoundRect(area, 3, { color: 5, width: 2 }),
    );
  });

  it("draws a band an odd number of pixels wide about its crisp edge, half a pixel in on every side", () => {
    expect(crispOutline(area, 3, { color: 5, width: 3 })).toEqual(
      outlineRoundRect({ x: 4.5, y: 4.5, width: 19, height: 9 }, 3, {
        color: 5,
        width: 3,
      }),
    );
  });
});

describe("crispEdge", () => {
  it.each([
    [
      "an even number of pixels wide about a whole area, the area itself",
      { x: 4, y: 4, width: 20, height: 10 },
      2,
      { x: 4, y: 4, width: 20, height: 10 },
    ],
    [
      "an odd number wide about a whole area, half a pixel in on every side alike",
      { x: 4, y: 4, width: 20, height: 10 },
      3,
      { x: 4.5, y: 4.5, width: 19, height: 9 },
    ],
    [
      "about an area off whole pixels, its band's outer edges each moved in to one",
      { x: 4.3, y: 4.7, width: 20, height: 10 },
      2,
      { x: 5, y: 5, width: 19, height: 9 },
    ],
  ])("gives a band %s", (_, area, width, edge) => {
    expect(crispEdge(area, width)).toEqual(edge);
  });
});

describe("diePips", () => {
  const middle = { x: 50, y: 50 };
  const style = { color: 3 };

  /** Returns where each pip of a face sits. */
  function placesOf(count: number): readonly (readonly [number, number])[] {
    return diePips(count, middle, 10, 2, style).map(({ x, y }) => [x, y]);
  }

  it.each([
    [1, [[50, 50]]],
    [
      2,
      [
        [60, 40],
        [40, 60],
      ],
    ],
    [
      3,
      [
        [60, 40],
        [50, 50],
        [40, 60],
      ],
    ],
    [
      4,
      [
        [40, 40],
        [60, 40],
        [40, 60],
        [60, 60],
      ],
    ],
    [
      5,
      [
        [40, 40],
        [60, 40],
        [50, 50],
        [40, 60],
        [60, 60],
      ],
    ],
    [
      6,
      [
        [40, 40],
        [60, 40],
        [40, 50],
        [60, 50],
        [40, 60],
        [60, 60],
      ],
    ],
  ])("lays %i pips as a die's face does", (count, places) => {
    expect(placesOf(count)).toEqual(places);
  });

  it("draws each pip as a circle of the radius, in the style's color", () => {
    expect(diePips(1, middle, 10, 2, style)).toEqual([
      { kind: "circle", x: 50, y: 50, radius: 2, color: 3 },
    ]);
  });

  it.each([0, 7, 1.5])(
    "refuses %s pips, which no die's face shows",
    (count) => {
      expect(() => diePips(count, middle, 10, 2, style)).toThrow(RangeError);
    },
  );
});

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

    expect(
      [inner?.x, inner?.y, outer?.x, outer?.y].map((n) => billionths(n ?? NaN)),
    ).toEqual([9, 1, 11, -1]);
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

    expect(
      [left?.x, left?.y, right?.x, right?.y].map((n) => billionths(n ?? NaN)),
    ).toEqual([-1.25, 0, 1.25, 0]);
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

  it.each([0, 1])("refuses a line of %i points", (count) => {
    const points = Array.from({ length: count }, () => ({ x: 0, y: 0 }));

    expect(() => bandAlong(points, 2)).toThrow(RangeError);
  });
});
