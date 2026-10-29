import { type Box, SIDE } from "./grid";
import { MISSED, sweepCorner, sweepFace } from "./sweep";

/** A brick's box: from 4 to 6 across, and 2 to 3 down. */
const BRICK: Box = { left: 4, top: 2, right: 6, bottom: 3 };

/** Sweeps a ball of radius 0.5 against a face of the brick. */
function face(
  x: number,
  y: number,
  dx: number,
  dy: number,
  side: number = SIDE.bottom,
): number {
  return sweepFace({ x, y, dx, dy, r: 0.5 }, BRICK, side);
}

/** Sweeps a ball of radius 0.5 against a corner of the brick. */
function corner(
  x: number,
  y: number,
  dx: number,
  dy: number,
  which: number = SIDE.bottomLeft,
): number {
  return sweepCorner({ x, y, dx, dy, r: 0.5 }, BRICK, which);
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

  it("misses a face where the ball reaches its line beside it", () => {
    expect(face(7, 5, 0, -2)).toBe(MISSED);
  });

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

  it("finds no face for a side that is a corner", () => {
    expect(face(4, 5, 0, -2, SIDE.bottomLeft)).toBe(MISSED);
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

  it("finds no corner for a side that is a face", () => {
    expect(corner(5, 5, 0, -2, SIDE.bottom)).toBe(MISSED);
  });
});
