import { MISSED, sweepPoint, sweepSegment } from "./sweep";

/** The radius every ball here has. */
const R = 0.5;

// A brick's bottom face: the line y = 3 from x = 4 to x = 6, facing down.
const BOTTOM = { line: 3, from: 4, to: 6, nx: 0, ny: 1 } as const;

/** Sweeps a ball of radius R against the bottom face. */
function sweepBottom(x: number, y: number, dx: number, dy: number): number {
  const { line, from, to, nx, ny } = BOTTOM;
  return sweepSegment(x, y, dx, dy, R, line, from, to, nx, ny);
}

describe("sweepSegment", () => {
  it("finds when a ball rising toward a face touches it", () => {
    // The ball's top reaches the face once its center is at 3.5.
    expect(sweepBottom(5, 5, 0, -2)).toBeCloseTo(0.75);
  });

  it("finds a face a ball crosses at an angle", () => {
    expect(sweepBottom(4, 5, 1, -3)).toBeCloseTo(0.5);
  });

  it("finds a face however far beyond it the move would go", () => {
    expect(sweepBottom(5, 5, 0, -100)).toBeCloseTo(0.015);
  });

  it("misses a face the ball doesn't reach this move", () => {
    expect(sweepBottom(5, 5, 0, -1)).toBe(MISSED);
  });

  it("misses a face the ball moves away from", () => {
    expect(sweepBottom(5, 3.5, 0, 1)).toBe(MISSED);
  });

  it("misses a face the ball slides along", () => {
    expect(sweepBottom(3, 3.5, 2, 0)).toBe(MISSED);
  });

  it("misses a face where the ball reaches its line beside it", () => {
    expect(sweepBottom(7, 5, 0, -2)).toBe(MISSED);
  });

  it("touches at once a face the ball already touches", () => {
    expect(sweepBottom(5, 3.5, 0, -1)).toBe(0);
  });

  it("touches at once a face the ball is a little through", () => {
    expect(sweepBottom(5, 3.2, 0, -1)).toBe(0);
  });

  it("misses a face the ball's center has passed", () => {
    expect(sweepBottom(5, 2.9, 0, -1)).toBe(MISSED);
  });

  it("finds a face that runs down, by its normal", () => {
    // A left face: the line x = 4 from y = 2 to y = 3, facing left.
    const t = sweepSegment(2, 2.5, 2, 0, R, 4, 2, 3, -1, 0);

    expect(t).toBeCloseTo(0.75);
  });
});

describe("sweepPoint", () => {
  it("finds when a ball moving toward a corner touches it", () => {
    // Straight at the corner (4, 3), from 2 below it.
    expect(sweepPoint(4, 5, 0, -2, R, 4, 3)).toBeCloseTo(0.75);
  });

  it("finds a corner the ball's edge only grazes", () => {
    // Passing 0.4 to the side: it touches where its center is 0.3 below.
    expect(sweepPoint(4.4, 5, 0, -2, R, 4, 3)).toBeCloseTo(0.85);
  });

  it("misses a corner the ball passes wide of", () => {
    expect(sweepPoint(4.6, 5, 0, -2, R, 4, 3)).toBe(MISSED);
  });

  it("misses a corner the ball doesn't reach this move", () => {
    expect(sweepPoint(4, 5, 0, -1, R, 4, 3)).toBe(MISSED);
  });

  it("misses a corner the ball moves away from", () => {
    expect(sweepPoint(4, 3.4, 0, 1, R, 4, 3)).toBe(MISSED);
  });

  it("touches at once a corner the ball already overlaps", () => {
    expect(sweepPoint(4, 3.4, 0, -1, R, 4, 3)).toBe(0);
  });
});
