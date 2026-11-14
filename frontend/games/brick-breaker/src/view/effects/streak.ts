import type { Ball } from "../../rules/paddle/balls";
import { FIELD_WIDTH, STREAK } from "../../rules/tuning";

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

/**
 * Returns whether a brick broken at a streak so long took it to a step, or
 * to the level's mark, the streak its third star asks for.
 */
export function isStreakStep(streak: number, mark: number): boolean {
  return streak === mark || STREAK_STEPS.includes(streak);
}

/** How tall a streak's count is written, and how wide the outline round it, in field units. */
export const COUNT_TEXT = { size: 1.1, outline: 0.28 } as const;

/** How bold a streak's count is written, as CSS weighs a font. */
export const COUNT_WEIGHT = 700;

/** How far a streak's count lies from its ball's middle, across and up, in field units. */
export const COUNT_BESIDE = 0.6;

/** Says where something lies on the field, in field units. */
export interface FieldPlace {
  x: number;
  y: number;
}

/**
 * Writes where the top left corner of a streak's count so wide and so tall
 * lies beside its ball, in field units: above the ball and to its right, or
 * to its left by the right wall, or below it by the top, so all of it lies
 * on the field.
 */
export function countCorner(
  ball: Readonly<FieldPlace>,
  width: number,
  height: number,
  corner: FieldPlace,
): void {
  const right = ball.x + COUNT_BESIDE;
  corner.x =
    right + width <= FIELD_WIDTH ? right : ball.x - COUNT_BESIDE - width;
  const top = ball.y - COUNT_BESIDE - height;
  corner.y = top >= 0 ? top : ball.y + COUNT_BESIDE;
}

/** Names the balls a search takes: those in flight, or every ball in play, one held on the paddle too. */
export type BallsTaken = "flying" | "inPlay";

/**
 * Returns the ball nearest a place among those it takes, by its place
 * among the field's balls, or -1 where it takes none.
 */
export function nearestBall(
  balls: readonly Readonly<Pick<Ball, "live" | "held" | "x" | "y">>[],
  x: number,
  y: number,
  taking: BallsTaken = "flying",
): number {
  let nearest = -1;
  let least = Infinity;
  for (const [i, ball] of balls.entries()) {
    if (!ball.live || (ball.held && taking === "flying")) continue;
    const distance = Math.hypot(ball.x - x, ball.y - y);
    if (distance < least) {
      least = distance;
      nearest = i;
    }
  }
  return nearest;
}
