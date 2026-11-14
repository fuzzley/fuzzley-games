import { FIELD_WIDTH } from "../../rules/tuning";
import {
  COUNT_BESIDE,
  type FieldPlace,
  STREAK_STEPS,
  countCorner,
  isStreakStep,
  nearestBall,
  streakTier,
} from "./streak";

/** Returns where a count so wide and so tall lies beside a ball at a place. */
function cornerBeside(
  x: number,
  y: number,
  width: number,
  height: number,
): FieldPlace {
  const corner = { x: 0, y: 0 };
  countCorner({ x, y }, width, height, corner);
  return corner;
}

/** Returns a ball at a place, in flight, on the paddle or out of play. */
function ballAt(
  x: number,
  y: number,
  where: "flying" | "held" | "out" = "flying",
): { live: boolean; held: boolean; x: number; y: number } {
  return { live: where !== "out", held: where === "held", x, y };
}

describe("STREAK_STEPS", () => {
  it("steps at each of the multiplier's tiers, lowest first", () => {
    expect(STREAK_STEPS).toEqual([5, 10, 20]);
  });
});

describe("streakTier", () => {
  it.each([
    [0, 0],
    [4, 0],
    [5, 1],
    [9, 1],
    [10, 2],
    [20, 3],
    [50, 3],
  ])("puts a streak of %i at step %i", (streak, tier) => {
    expect(streakTier(streak)).toBe(tier);
  });
});

describe("isStreakStep", () => {
  it.each([
    [4, false],
    [5, true],
    [6, false],
    [10, true],
    [20, true],
    [25, false],
  ])("says a streak of %i is a step: %s", (streak, step) => {
    expect(isStreakStep(streak)).toBe(step);
  });
});

describe("countCorner", () => {
  it("lays a count above a ball and to its right", () => {
    expect(cornerBeside(10, 20, 2, 1)).toEqual({
      x: 10 + COUNT_BESIDE,
      y: 20 - COUNT_BESIDE - 1,
    });
  });

  it("lays a count to a ball's left by the right wall", () => {
    expect(cornerBeside(FIELD_WIDTH - 1, 20, 2, 1).x).toBe(
      FIELD_WIDTH - 1 - COUNT_BESIDE - 2,
    );
  });

  it("lays a count below a ball by the top", () => {
    expect(cornerBeside(10, 1, 2, 1).y).toBe(1 + COUNT_BESIDE);
  });
});

describe("nearestBall", () => {
  it("finds the ball in flight nearest a place", () => {
    const balls = [ballAt(2, 20), ballAt(9, 12), ballAt(20, 5)];

    expect(nearestBall(balls, 10, 10)).toBe(1);
  });

  it("passes over a ball on the paddle or out of play", () => {
    const balls = [ballAt(10, 10, "held"), ballAt(10, 10, "out"), ballAt(2, 2)];

    expect(nearestBall(balls, 10, 10)).toBe(2);
  });

  it("finds none where no ball is in flight", () => {
    expect(nearestBall([ballAt(10, 10, "held")], 10, 10)).toBe(-1);
  });
});
