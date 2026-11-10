import {
  ALL_SIDES,
  type Box,
  CORNERS,
  CORNER_AT,
  type Corner,
  FACES,
  FACE_NORMAL,
  type Face,
  MISSED,
  type Move,
  SIDE,
  type Solid,
  exposureOf,
  sweepCorner,
  sweepFace,
  sweepPoint,
} from "./sweep";

/** A box: from 4 to 6 across, and 2 to 3 down. */
const BOX: Box = { left: 4, top: 2, right: 6, bottom: 3 };

/** Sweeps a ball of radius 0.5 against a face of the box. */
function face(
  x: number,
  y: number,
  dx: number,
  dy: number,
  side: Face = SIDE.bottom,
): number {
  return sweepFace({ x, y, dx, dy, r: 0.5 }, BOX, side);
}

/** Sweeps a ball of radius 0.5 against a corner of the box. */
function corner(
  x: number,
  y: number,
  dx: number,
  dy: number,
  which: Corner = SIDE.bottomLeft,
): number {
  return sweepCorner({ x, y, dx, dy, r: 0.5 }, BOX, which);
}

/** Sweeps a ball against the point (0, 0), reaching 0.75 from its center. */
function point(x: number, y: number, dx: number, dy: number): number {
  return sweepPoint({ x, y, dx, dy }, 0, 0, 0.75);
}

/** Returns a ball's move, its radius 0.36 unless another is given. */
function moveOf(x: number, y: number, dx: number, dy: number, r = 0.36): Move {
  return { x, y, dx, dy, r };
}

/** A box whose edges, like a field's, are no sums of powers of two. */
const ODD_BOX: Box = { left: 2.6, top: 1.3, right: 4.55, bottom: 2.1 };

/**
 * Returns which cells stop a ball, from rows of a grid `width` cells wide
 * drawn with `#` for a box: the walls beside it too, and nothing above or
 * below it.
 */
function solidFrom(width: number, rows: readonly string[]): Solid {
  return (column, row) =>
    column < 0 || column >= width || rows[row]?.[column] === "#";
}

/** Returns the names of the sides an exposure holds. */
function sidesOf(exposure: number): string[] {
  return Object.entries(SIDE)
    .filter(([, bit]) => (exposure & bit) !== 0)
    .map(([name]) => name);
}

describe("sweepFace", () => {
  it("finds when a ball rising toward the bottom touches it", () => {
    // The ball's top reaches the face once its center is at 3.5.
    expect(face(5, 5, 0, -2)).toBeCloseTo(0.75);
  });

  it("finds a face a ball crosses at an angle", () => {
    expect(face(4, 5, 1, -3)).toBeCloseTo(0.5);
  });

  it("finds a face however far beyond it the move would go", () => {
    expect(face(5, 5, 0, -100)).toBeCloseTo(0.015);
  });

  it("finds a face the ball reaches just as its move ends", () => {
    expect(face(5, 4.5, 0, -1)).toBe(1);
  });

  it("misses a face the ball doesn't reach this move", () => {
    expect(face(5, 5, 0, -1)).toBe(MISSED);
  });

  it.each([
    ["left", 4],
    ["right", 6],
  ])("finds a face met exactly at its %s end", (_, x) => {
    expect(face(x, 5, 0, -2)).toBeCloseTo(0.75);
  });

  it.each([
    ["left", 3],
    ["right", 7],
  ])(
    "misses a face where the ball reaches its line beside it, to the %s",
    (_, x) => {
      expect(face(x, 5, 0, -2)).toBe(MISSED);
    },
  );

  it("misses a face the ball moves away from", () => {
    expect(face(5, 3.5, 0, 1)).toBe(MISSED);
  });

  it("misses a face the ball slides along", () => {
    expect(face(5, 3.5, 2, 0)).toBe(MISSED);
  });

  it("touches at once a face the ball already touches", () => {
    expect(face(5, 3.5, 0, -1)).toBe(0);
  });

  it("touches at once a face the ball is partly through", () => {
    expect(face(5, 3.2, 0, -1)).toBe(0);
  });

  it("touches at once a face the ball's center is on", () => {
    expect(face(5, 3, 0, -1)).toBe(0);
  });

  it("misses a face the ball's center has passed", () => {
    expect(face(5, 2.9, 0, -1)).toBe(MISSED);
  });

  it.each([
    ["top", SIDE.top, 5, 0, 0, 2],
    ["left", SIDE.left, 2, 2.5, 2, 0],
    ["right", SIDE.right, 8, 2.5, -2, 0],
  ])("finds the %s face from its side", (_, side, x, y, dx, dy) => {
    expect(face(x, y, dx, dy, side)).toBeCloseTo(0.75);
  });
});

describe("sweepCorner", () => {
  it("finds when a ball moving toward a corner touches it", () => {
    // Straight at the corner (4, 3), from 2 below it.
    expect(corner(4, 5, 0, -2)).toBeCloseTo(0.75);
  });

  it("finds a corner the ball's edge only partly meets", () => {
    // Passing 0.4 to the side: it touches where its center is 0.3 below.
    expect(corner(4.4, 5, 0, -2)).toBeCloseTo(0.85);
  });

  it("misses a corner the ball would only graze", () => {
    expect(corner(4.5, 5, 0, -2)).toBe(MISSED);
  });

  it("misses a corner the ball passes wide of", () => {
    expect(corner(4.6, 5, 0, -2)).toBe(MISSED);
  });

  it("misses a corner the ball doesn't reach this move", () => {
    expect(corner(4, 5, 0, -1)).toBe(MISSED);
  });

  it("misses a corner the ball moves away from", () => {
    expect(corner(4, 3.4, 0, 1)).toBe(MISSED);
  });

  it("misses a corner when the ball doesn't move", () => {
    expect(corner(4, 3.6, 0, 0)).toBe(MISSED);
  });

  it("touches at once a corner the ball already overlaps", () => {
    expect(corner(4, 3.4, 0, -1)).toBe(0);
  });

  // A ball 1 out from a corner each way, heading straight at it.
  it.each([
    ["top left", SIDE.topLeft, 3, 1, 1, 1],
    ["top right", SIDE.topRight, 7, 1, -1, 1],
    ["bottom right", SIDE.bottomRight, 7, 4, -1, -1],
    ["bottom left", SIDE.bottomLeft, 3, 4, 1, -1],
  ])("finds the %s corner", (_, which, x, y, dx, dy) => {
    expect(corner(x, y, dx, dy, which)).toBeCloseTo(1 - 0.5 / Math.SQRT2);
  });
});

describe("sweepPoint", () => {
  it("finds when a ball's center comes within reach of a point", () => {
    // Its center reaches 0.75 from the point once it is 1.25 on its way.
    expect(point(0, 2, 0, -2)).toBe(0.625);
  });

  it("finds a point the ball reaches just as its move ends", () => {
    expect(point(0, 2, 0, -1.25)).toBe(1);
  });

  it("misses a point the ball passes beyond reach of", () => {
    expect(point(0.8, 2, 0, -4)).toBe(MISSED);
  });

  it("misses a point the ball doesn't reach this move", () => {
    expect(point(0, 2, 0, -1)).toBe(MISSED);
  });

  it("misses a point the ball moves away from", () => {
    expect(point(0, 2, 0, 1)).toBe(MISSED);
  });

  it("touches at once a point the ball is already within reach of", () => {
    expect(point(0, 0.7, 0, -1)).toBe(0);
  });

  it("misses a point the ball is within reach of but moves across", () => {
    expect(point(0, 0.7, 1, 0)).toBe(MISSED);
  });
});

describe("MISSED", () => {
  it("comes after the end of any move, so the first of many sweeps is the least", () => {
    expect(MISSED).toBeGreaterThan(1);
  });
});

// The shares as the arithmetic gives them, to the last bit, on moves whose
// numbers round. A game replays its moves on these, in any engine, so a
// change that moves one by a bit fails here: a distance taken with
// Math.hypot(), a quotient made a product, a sum taken in another order.
describe("the shares", () => {
  it.each([
    [
      "a bottom face",
      () => sweepFace(moveOf(3.17, 3.9, 0.41, -2.3), ODD_BOX, SIDE.bottom),
      0.6260869565217392,
    ],
    [
      "a top face",
      () => sweepFace(moveOf(4.1, -0.7, -0.33, 1.7), ODD_BOX, SIDE.top),
      0.9647058823529413,
    ],
    [
      "a left face",
      () => sweepFace(moveOf(1.1, 1.77, 1.9, 0.13), ODD_BOX, SIDE.left),
      0.6000000000000001,
    ],
    [
      "a right face",
      () => sweepFace(moveOf(6.03, 1.41, -2.7, 0.29), ODD_BOX, SIDE.right),
      0.41481481481481497,
    ],
    [
      "a top left corner",
      () => sweepCorner(moveOf(1.9, 0.2, 0.72, 1.07), ODD_BOX, SIDE.topLeft),
      0.7327043522471582,
    ],
    [
      "a top right corner",
      () => sweepCorner(moveOf(5.3, 0.45, -0.81, 0.93), ODD_BOX, SIDE.topRight),
      0.6272895762215775,
    ],
    [
      "a bottom right corner",
      () =>
        sweepCorner(
          moveOf(5.21, 2.93, -0.77, -0.71),
          ODD_BOX,
          SIDE.bottomRight,
        ),
      0.693888015653607,
    ],
    [
      "a bottom left corner",
      () =>
        sweepCorner(moveOf(1.83, 3.07, 0.9, -1.13), ODD_BOX, SIDE.bottomLeft),
      0.608102085850005,
    ],
    [
      "a point reached from below",
      () => sweepPoint(moveOf(5.71, 9.4, -0.19, -2.03), 5.5, 7.25, 0.74),
      0.6965935886001221,
    ],
    [
      "a point reached from the left",
      () => sweepPoint(moveOf(3.9, 7.03, 1.37, 0.33), 5.5, 7.25, 0.74),
      0.6278182895158445,
    ],
    [
      "a point reached from above and to the right",
      () => sweepPoint(moveOf(6.8, 5.9, -1.21, 1.17), 5.5, 7.25, 0.74),
      0.6749236596223701,
    ],
    [
      "a point reached at the ball's radius",
      () => sweepPoint(moveOf(4.4, 6.2, 1.03, 0.97), 5.5, 7.25, 0.36),
      0.8204418525586914,
    ],
  ])("are pinned to the bit on %s", (_, sweep, pinned) => {
    expect(sweep()).toBe(pinned);
  });
});

describe("a box's sides", () => {
  it("are every face and corner, as ALL_SIDES", () => {
    expect(sidesOf(ALL_SIDES)).toEqual(Object.keys(SIDE));
  });

  it("list the faces clockwise from the top, each facing out of the box", () => {
    expect(FACES.map((side) => FACE_NORMAL[side])).toEqual([
      { x: 0, y: -1 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
    ]);
  });

  it("list the corners clockwise from the top left, each on its edges", () => {
    expect(CORNERS.map((side) => CORNER_AT[side])).toEqual([
      { x: "left", y: "top" },
      { x: "right", y: "top" },
      { x: "right", y: "bottom" },
      { x: "left", y: "bottom" },
    ]);
  });
});

describe("exposureOf", () => {
  it("exposes every face and corner of a box alone", () => {
    const solid = solidFrom(9, ["", "....#"]);

    expect(sidesOf(exposureOf(solid, 4, 1))).toEqual(Object.keys(SIDE));
  });

  it("makes one face of boxes side by side, with no corner at the seam", () => {
    const solid = solidFrom(9, ["", "....##"]);

    expect(sidesOf(exposureOf(solid, 4, 1))).toEqual([
      "top",
      "bottom",
      "left",
      "topLeft",
      "bottomLeft",
    ]);
  });

  it("hides the face a box above covers, and its corners", () => {
    const solid = solidFrom(9, ["....#", "....#"]);

    expect(sidesOf(exposureOf(solid, 4, 1))).toEqual([
      "right",
      "bottom",
      "left",
      "bottomRight",
      "bottomLeft",
    ]);
  });

  it("hides the face and corners against the left wall", () => {
    const solid = solidFrom(9, ["", "#"]);

    expect(sidesOf(exposureOf(solid, 0, 1))).toEqual([
      "top",
      "right",
      "bottom",
      "topRight",
      "bottomRight",
    ]);
  });

  it("hides the face a box below covers, and its corners", () => {
    const solid = solidFrom(9, ["", "....#", "....#"]);

    expect(sidesOf(exposureOf(solid, 4, 1))).toEqual([
      "top",
      "right",
      "left",
      "topLeft",
      "topRight",
    ]);
  });

  it("hides the face and corners against the right wall", () => {
    const solid = solidFrom(9, ["", "........#"]);

    expect(sidesOf(exposureOf(solid, 8, 1))).toEqual([
      "top",
      "bottom",
      "left",
      "topLeft",
      "bottomLeft",
    ]);
  });

  it.each([
    ["topLeft", ["...#", "....#", ""]],
    ["topRight", [".....#", "....#", ""]],
    ["bottomRight", ["", "....#", ".....#"]],
    ["bottomLeft", ["", "....#", "...#"]],
  ])(
    "hides only the %s corner a box across from it touches",
    (hidden, rows) => {
      const solid = solidFrom(9, rows);

      expect(sidesOf(exposureOf(solid, 4, 1))).toEqual(
        Object.keys(SIDE).filter((side) => side !== hidden),
      );
    },
  );

  it("exposes the top of the first row, under the open space", () => {
    const solid = solidFrom(9, ["#"]);

    expect(exposureOf(solid, 0, 0) & SIDE.top).toBe(SIDE.top);
  });
});
