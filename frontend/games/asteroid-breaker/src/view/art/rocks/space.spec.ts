import { createRandom } from "@fz/core/random";
import { around, facingOf, hull, jagged, reachAt, unitFacing } from "./space";

describe("unitFacing()", () => {
  it("makes a way a unit long", () => {
    expect(unitFacing({ x: 3, y: 0, z: 4 })).toEqual({ x: 0.6, y: 0, z: 0.8 });
  });

  it("keeps a way of no length as it is", () => {
    expect(unitFacing({ x: 0, y: 0, z: 0 })).toEqual({ x: 0, y: 0, z: 0 });
  });
});

describe("facingOf()", () => {
  const a = { x: 0, y: 0 };
  const b = { x: 1, y: 0 };
  const c = { x: 0, y: 1 };

  it("faces a triangle toward the viewer whichever way its corners run", () => {
    const one = facingOf(a, 0, b, 0, c, 0);

    const other = facingOf(a, 0, c, 0, b, 0);

    expect([one, other]).toEqual([
      { x: 0, y: 0, z: 1 },
      { x: -0, y: -0, z: 1 },
    ]);
  });

  it("tilts a triangle toward its lower corners", () => {
    const facing = facingOf(a, 1, b, 0, c, 1);

    expect(facing.x).toBeGreaterThan(0);
    expect(facing.y).toBeCloseTo(0, 12);
  });
});

describe("jagged()", () => {
  it("runs from one end to the other through its steps", () => {
    const from = { x: 0, y: 0 };
    const to = { x: 4, y: 0 };

    const line = jagged(createRandom(1), from, to, 4, 0.1);

    expect(line).toHaveLength(5);
    expect([line[0], line.at(-1)]).toEqual([from, to]);
    for (const { y } of line) expect(Math.abs(y)).toBeLessThanOrEqual(0.4);
  });

  it("keeps a line of no length where it is", () => {
    const at = { x: 1, y: 1 };

    const line = jagged(createRandom(1), at, at, 3, 0.5);

    expect(line).toEqual([at, at, at, at]);
  });
});

describe("hull()", () => {
  it("goes round the outermost points, leaving those inside and along its sides", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 0, y: 2 },
      { x: 0, y: 2 },
    ];

    expect(hull(points)).toEqual([
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 2 },
      { x: 0, y: 2 },
    ]);
  });
});

describe("reachAt()", () => {
  const square = [
    { x: -1, y: -1 },
    { x: 1, y: -1 },
    { x: 1, y: 1 },
    { x: -1, y: 1 },
  ];

  it("gives where a ray from the middle leaves an outline", () => {
    expect(reachAt(square, 0)).toBe(1);
    expect(reachAt(square, Math.PI / 4)).toBeCloseTo(Math.SQRT2, 12);
  });

  it("gives 1 where no ray leaves it", () => {
    expect(reachAt([], 0)).toBe(1);
  });
});

describe("around()", () => {
  const ring = ["a", "b", "c"];

  it("counts round a ring either way", () => {
    expect([
      around(ring, 0),
      around(ring, 3),
      around(ring, -1),
      around(ring, 4),
    ]).toEqual(["a", "a", "c", "b"]);
  });

  it("throws for a ring with nothing in it", () => {
    expect(() => around([], 0)).toThrow(RangeError);
  });
});
