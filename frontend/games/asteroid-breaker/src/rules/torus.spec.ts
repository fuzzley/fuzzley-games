import {
  type Torus,
  across,
  copyShift,
  distance,
  distanceSquared,
  pullToward,
  torusFor,
  wrap,
} from "./torus";

/** The narrowest field, a square. */
const SQUARE: Torus = { width: 40, height: 40 };

/** The widest field, on its side. */
const WIDEST: Torus = { width: 88, height: 40 };

describe("torusFor", () => {
  it.each([
    ["a square room", 1, 1, SQUARE],
    ["a room 2.2 to 1 on its side", 2.2, 1, WIDEST],
    ["a room 2.2 to 1 upright", 1, 2.2, { width: 40, height: 88 }],
  ])("fits %s", (_, width, height, torus) => {
    expect(torusFor(width, height)).toEqual(torus);
  });

  it.each([
    ["a roomy window's room", 1232, 679, 72.58, 40],
    ["an upright phone's room", 366, 564, 40, 61.64],
  ])(
    "fits %s, %d by %d CSS px, as %d by %d units",
    (_, roomWidth, roomHeight, width, height) => {
      const torus = torusFor(roomWidth, roomHeight);

      expect([torus.width, torus.height]).toEqual([
        expect.closeTo(width, 2),
        expect.closeTo(height, 2),
      ]);
    },
  );

  it("grows the long side no further than 88 units in a longer room", () => {
    expect(torusFor(3000, 1000)).toEqual(WIDEST);
  });

  it.each([
    [0, 1],
    [1, -1],
    [Number.NaN, 1],
    [1, Number.POSITIVE_INFINITY],
  ])("refuses a room of %d by %d", (width, height) => {
    expect(() => torusFor(width, height)).toThrow(RangeError);
  });
});

describe("wrap", () => {
  it.each([
    [0, 0],
    [12.5, 12.5],
    [40, 0],
    [41.5, 1.5],
    [-1.5, 38.5],
    [-80.5, 39.5],
    [123, 3],
  ])("puts %d at %d on an axis of 40", (at, wrapped) => {
    expect(wrap(at, 40)).toBeCloseTo(wrapped);
  });

  it("wraps a step just short of 0 to 0, not to the length", () => {
    expect(wrap(-1e-17, 40)).toBe(0);
  });
});

describe("across", () => {
  it.each([
    ["ahead", 10, 15, 5],
    ["back", 15, 10, -5],
    ["ahead across the wrap", 39, 1, 2],
    ["back across the wrap", 1, 39, -2],
    ["half the length ahead", 0, 20, 20],
    ["half the length back", 20, 0, -20],
    ["from a place off the axis", -5, 41, 6],
    ["a whole length ahead", 0, 40, 0],
    ["to a place lengths off the axis", 0, 85, 5],
    ["from a place lengths off the axis", 85, 0, -5],
  ])("goes %s", (_, from, to, way) => {
    expect(across(from, to, 40)).toBeCloseTo(way);
  });
});

describe("distanceSquared", () => {
  it("measures straight across the field when that is shortest", () => {
    expect(distanceSquared(WIDEST, 10, 10, 13, 14)).toBeCloseTo(25);
  });

  it.each([
    ["the left and right edges", 1, 20, 87, 20, 4],
    ["the top and bottom edges", 44, 1, 44, 39, 4],
    ["opposite corners", 87.5, 39.5, 0.5, 0.5, 2],
  ])(
    "measures across %s of the widest field",
    (_, fromX, fromY, toX, toY, squared) => {
      expect(distanceSquared(WIDEST, fromX, fromY, toX, toY)).toBeCloseTo(
        squared,
      );
    },
  );
});

describe("distance", () => {
  it("measures across the corner of a square field", () => {
    expect(distance(SQUARE, 39, 39, 2, 3)).toBeCloseTo(5);
  });
});

describe("copyShift", () => {
  it.each([
    [1, "past the start", "a copy a length on", 1],
    [-0.5, "just before the start", "a copy a length on", 1],
    [39, "past the end", "a copy a length back", -1],
    [40.3, "just after the end", "a copy a length back", -1],
    [20, "clear of both edges", "no copy", 0],
    [2, "touching the start", "no copy", 0],
    [38, "touching the end", "no copy", 0],
  ])(
    "gives an object of reach 2 at %d on an axis of 40, %s, %s",
    (at, _, __, shift) => {
      expect(copyShift(at, 2, 40)).toBe(shift);
    },
  );
});

describe("pullToward", () => {
  // Each pulls toward 10, 10 from within a reach of 5.5, by a length of 2.
  it.each([
    ["a length toward a place within its reach", 13, 14, true, 11.8, 12.4],
    ["to the place, never past it", 10.3, 10.4, true, 10, 10],
    ["a place already there nowhere", 10, 10, true, 10, 10],
    ["a place past its reach nowhere", 16, 10, false, 16, 10],
  ])("pulls %s", (_, x, y, pulled, toX, toY) => {
    const moving = { x, y };

    const did = pullToward(moving, { x: 10, y: 10 }, 5.5, 2, SQUARE);

    expect([did, moving.x, moving.y]).toEqual([
      pulled,
      expect.closeTo(toX),
      expect.closeTo(toY),
    ]);
  });

  it("pulls the shortest way across the wrap, wrapping onto the field", () => {
    const moving = { x: 39, y: 39 };

    pullToward(moving, { x: 1, y: 2 }, 5.5, 2, SQUARE);

    // 2 along the way of 2 and 3 across the corner, wrapped.
    expect([moving.x, moving.y]).toEqual([
      expect.closeTo(39 + 4 / Math.sqrt(13) - 40),
      expect.closeTo(39 + 6 / Math.sqrt(13) - 40),
    ]);
  });
});
