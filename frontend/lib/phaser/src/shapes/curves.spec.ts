import {
  arcPoints,
  cubicPoints,
  ellipsePoints,
  quadraticPoints,
} from "./curves";
import type { Point } from "./shapes";

/** Returns points rounded to a thousandth, so specs compare them plainly. */
function rounded(points: readonly Point[]): readonly Point[] {
  return points.map(({ x, y }) => ({
    x: Math.round(x * 1000) / 1000 + 0,
    y: Math.round(y * 1000) / 1000 + 0,
  }));
}

describe("arcPoints", () => {
  it("runs an arc from one angle to the other, both ends among its points, on its circle", () => {
    const points = arcPoints({ x: 10, y: 0 }, 2, 0, Math.PI);

    expect({
      first: rounded(points.slice(0, 1)),
      last: rounded(points.slice(-1)),
      onCircle: points.every(
        (point) => Math.abs(Math.hypot(point.x - 10, point.y) - 2) < 1e-9,
      ),
      pieces: points.length - 1,
    }).toEqual({
      first: [{ x: 12, y: 0 }],
      last: [{ x: 8, y: 0 }],
      onCircle: true,
      pieces: 20,
    });
  });

  it("runs an arc of no turn as a single piece", () => {
    expect(arcPoints({ x: 0, y: 0 }, 1, 1, 1)).toHaveLength(2);
  });
});

describe("ellipsePoints", () => {
  it("goes round an ellipse once, on it, from its right", () => {
    const points = ellipsePoints({ x: 1, y: 2 }, 4, 2);

    expect({
      count: points.length,
      onIt: points.every(
        ({ x, y }) =>
          Math.abs(((x - 1) / 4) ** 2 + ((y - 2) / 2) ** 2 - 1) < 1e-9,
      ),
      first: rounded(points.slice(0, 1)),
    }).toEqual({ count: 40, onIt: true, first: [{ x: 5, y: 2 }] });
  });
});

describe("quadraticPoints", () => {
  it("runs a quadratic curve past its start to its end, through its middle point", () => {
    const points = quadraticPoints(
      { x: 0, y: 0 },
      { x: 4, y: 8 },
      { x: 8, y: 0 },
    );

    expect([
      points.length,
      rounded(points.slice(3, 4)),
      rounded(points.slice(-1)),
    ]).toEqual([8, [{ x: 4, y: 4 }], [{ x: 8, y: 0 }]]);
  });
});

describe("cubicPoints", () => {
  it("runs a cubic curve past its start to its end, through its middle point", () => {
    const points = cubicPoints(
      { x: 0, y: 0 },
      { x: 0, y: 8 },
      { x: 8, y: 8 },
      { x: 8, y: 0 },
    );

    expect([
      points.length,
      rounded(points.slice(3, 4)),
      rounded(points.slice(-1)),
    ]).toEqual([8, [{ x: 4, y: 6 }], [{ x: 8, y: 0 }]]);
  });
});
