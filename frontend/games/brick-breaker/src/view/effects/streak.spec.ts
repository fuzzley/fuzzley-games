import { STREAK_STEPS, streakTier } from "./streak";

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
