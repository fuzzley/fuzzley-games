import { createRandom } from "@fz/core/random";
import { TURN } from "../../rules/angles";
import {
  LIGHT,
  bandOf,
  between,
  crater,
  forked,
  globe,
  lightOn,
  onRing,
  pick,
  polar,
  rotated,
} from "./globes";

/** Rings of a globe a spec cuts. */
const RINGS = [
  { at: 1, sides: 12 },
  { at: 0.6, sides: 6 },
  { at: 0.3, sides: 3 },
];

/** Returns the area a polygon's points enclose. */
function areaOf(points: readonly { x: number; y: number }[]): number {
  let twice = 0;
  points.forEach(({ x, y }, i) => {
    const next = points[(i + 1) % points.length] ?? { x, y };
    twice += x * next.y - next.x * y;
  });
  return Math.abs(twice) / 2;
}

/** Returns how far a point lies from the origin. */
function reach({ x, y }: { x: number; y: number }): number {
  return Math.hypot(x, y);
}

describe("lightOn", () => {
  it("lights a face that looks straight at the light the most, a little over 1", () => {
    expect(lightOn(LIGHT)).toBeCloseTo(1.25);
  });

  it("lights a face turned from the light the least, 0.3", () => {
    expect(lightOn([-LIGHT[0], -LIGHT[1], -LIGHT[2]])).toBe(0.3);
  });

  it("lights a face toward the upper left more than one toward the lower right", () => {
    expect(lightOn([-0.6, -0.6, 0.53])).toBeGreaterThan(
      lightOn([0.6, 0.6, 0.53]),
    );
  });
});

describe("between", () => {
  it("draws a number from a span", () => {
    expect([between(() => 0, 2, 4), between(() => 0.5, 2, 4)]).toEqual([2, 3]);
  });
});

describe("pick", () => {
  it("draws one of a list's entries", () => {
    expect([
      pick(() => 0, ["a", "b", "c"]),
      pick(() => 0.99, ["a", "b", "c"]),
    ]).toEqual(["a", "c"]);
  });
});

describe("polar", () => {
  it("lays a point at an angle and a distance from a middle, a quarter turn down", () => {
    const point = polar(TURN / 4, 2, { x: 1, y: 1 });

    expect([point.x, point.y]).toEqual([expect.closeTo(1), expect.closeTo(3)]);
  });
});

describe("rotated", () => {
  it("turns a point about the origin", () => {
    const point = rotated({ x: 1, y: 0 }, TURN / 4);

    expect([point.x, point.y]).toEqual([expect.closeTo(0), expect.closeTo(1)]);
  });
});

describe("globe", () => {
  it("cuts a disc of radius 1 in triangles, each corner on it", () => {
    const faces = globe(createRandom(1), RINGS);

    const outside = faces
      .flatMap(({ points }) => points)
      .filter((point) => reach(point) > 1 + 1e-9);

    expect({
      triangles: faces.every(({ points }) => points.length === 3),
      outside,
    }).toEqual({
      triangles: true,
      outside: [],
    });
  });

  it("joins each ring to the next, and the last to a top", () => {
    const faces = globe(createRandom(1), RINGS);

    expect(faces).toHaveLength(12 + 6 + 6 + 3 + 3);
  });

  it("covers the disc its outer ring bounds with its faces, none over another", () => {
    const faces = globe(createRandom(1), RINGS);
    const rim = faces
      .flatMap(({ points }) => points)
      .filter((point) => Math.abs(reach(point) - 1) < 1e-9)
      .filter(
        (point, i, all) =>
          all.findIndex(({ x, y }) => x === point.x && y === point.y) === i,
      )
      .sort((a, b) => Math.atan2(a.y, a.x) - Math.atan2(b.y, b.x));

    const faceArea = faces.reduce((sum, { points }) => sum + areaOf(points), 0);

    expect(faceArea).toBeCloseTo(areaOf(rim), 9);
  });

  it("lights each face from 0.3 to a little over 1", () => {
    const lights = globe(createRandom(1), RINGS).map(({ light }) => light);

    expect([Math.min(...lights) >= 0.3, Math.max(...lights) <= 1.25]).toEqual([
      true,
      true,
    ]);
  });

  it("lights the faces toward the light more than those away from it", () => {
    const faces = globe(createRandom(1), RINGS);
    const meanLight = (side: number): number => {
      const lit = faces.filter(
        ({ points }) =>
          Math.sign(points.reduce((sum, { x, y }) => sum + x + y, 0)) === side,
      );
      return lit.reduce((sum, { light }) => sum + light, 0) / lit.length;
    };

    expect(meanLight(-1)).toBeGreaterThan(meanLight(1));
  });

  it("cuts the same globe from the same draws", () => {
    expect(globe(createRandom(3), RINGS)).toEqual(
      globe(createRandom(3), RINGS),
    );
  });
});

describe("crater", () => {
  it("lays a floor and walls within the crater's rim", () => {
    const faces = crater({ x: 0.2, y: 0.1 }, 0.3, 0);

    const outside = faces
      .flatMap(({ points }) => points)
      .filter(({ x, y }) => Math.hypot(x - 0.2, y - 0.1) > 0.3 + 1e-9);

    expect(outside).toEqual([]);
  });

  it("lays the floor first, then a wall on each side the light falls on or turns from, and none along it", () => {
    const [floor, ...walls] = crater({ x: -0.3, y: 0.2 }, 0.3, 0);

    expect([floor?.points.length, walls.length > 0, walls.length < 14]).toEqual(
      [14, true, true],
    );
  });

  it("lights the wall facing the light more than the one in its shade", () => {
    const [, ...walls] = crater({ x: -0.3, y: 0.2 }, 0.3, 0);
    const lights = walls.map(({ light }) => light);

    expect(Math.max(...lights) - Math.min(...lights)).toBeGreaterThan(0.5);
  });

  it("lights the floor of a crater on the globe's edge, turned from the light, as dimly as a floor goes", () => {
    const [floor] = crater({ x: 1, y: 0 }, 0.1, 0);

    expect(floor?.light).toBe(0.32);
  });

  it("draws a crater at the globe's very middle, which faces no way along it, as a point, as the kit does", () => {
    const faces = crater({ x: 0, y: 0 }, 0.1, 0);

    expect(faces.flatMap(({ points }) => points)).toEqual(
      Array.from({ length: 14 }, () => ({ x: 0, y: 0 })),
    );
  });
});

describe("onRing", () => {
  const RING = { middle: { x: 10, y: 20 }, squash: 0.5, tilt: 0 };

  it("lays a point on a ring at a reach and an angle, squashed as a ring seen from the side", () => {
    const [side, near] = [onRing(RING, 4, 0), onRing(RING, 4, TURN / 4)];

    expect([side.x, side.y, near.x, near.y]).toEqual([
      14,
      20,
      expect.closeTo(10),
      expect.closeTo(22),
    ]);
  });

  it("tilts the ring about its middle", () => {
    const point = onRing({ ...RING, tilt: TURN / 4 }, 4, 0);

    expect([point.x, point.y]).toEqual([
      expect.closeTo(10),
      expect.closeTo(24),
    ]);
  });
});

describe("bandOf", () => {
  const RING = { middle: { x: 0, y: 0 }, squash: 1, tilt: 0 };

  it("traces a stretch of a band along its outer edge, then back along its inner", () => {
    const band = bandOf(RING, [1, 2], [0, TURN / 4], 2);

    expect(band.map(reach)).toEqual([
      expect.closeTo(2),
      expect.closeTo(2),
      expect.closeTo(2),
      expect.closeTo(1),
      expect.closeTo(1),
      expect.closeTo(1),
    ]);
  });

  it("ends its inner edge where its outer edge began", () => {
    const band = bandOf(RING, [1, 2], [0, TURN / 4], 4);
    const [first] = band;
    const last = band.at(-1);

    expect([first?.y, last?.y, last?.x]).toEqual([0, 0, 1]);
  });
});

describe("forked", () => {
  it("runs from one point to another through as many steps", () => {
    const line = forked(
      createRandom(1),
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      5,
      0.1,
    );

    expect([line.length, line[0], line.at(-1)]).toEqual([
      6,
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ]);
  });

  it("strays across the way by its sway at most", () => {
    const line = forked(
      createRandom(1),
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      5,
      0.1,
    );

    expect(line.filter(({ y }) => Math.abs(y) > 1)).toEqual([]);
  });

  it("steps along the way evenly", () => {
    const line = forked(
      createRandom(1),
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      5,
      0.1,
    );

    expect(line.map(({ x }) => Math.round(x * 1e9) / 1e9)).toEqual([
      0, 2, 4, 6, 8, 10,
    ]);
  });
});
