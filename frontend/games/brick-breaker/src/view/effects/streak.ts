import { STREAK } from "../../rules/tuning";

/**
 * The streaks a broken brick takes to a step, lowest first: each of the
 * multiplier's tiers ({@link STREAK}), where it scores more.
 */
export const STREAK_STEPS: readonly number[] = STREAK.map(
  ({ from }) => from,
).sort((a, b) => a - b);

/** Returns how many of the multiplier's steps a streak has reached: 0 below the first. */
export function streakTier(streak: number): number {
  let tier = 0;
  for (const step of STREAK_STEPS) if (streak >= step) tier++;
  return tier;
}
