import type { Brick } from "./bricks";
import { brickKind } from "./catalog/bricks";
import type { Field } from "./field";
import { CLEAN_POINTS, CLEAR_POINTS, STREAK } from "./tuning";

/**
 * Returns how many times a hit scores, by how many bricks have broken since
 * the paddle last met a ball: once, then more for a long streak.
 */
export function multiplier(streak: number): number {
  for (const { from, times } of STREAK) {
    if (streak >= from) return times;
  }
  return 1;
}

/**
 * Adds a hit on a brick to the level's score: its kind's points for each of
 * the hits it took, times the streak's multiplier.
 */
export function scoreHit(
  field: Field,
  brick: Readonly<Brick>,
  taken: number,
): void {
  const points = brickKind(brick.kind).points * taken;
  const times = multiplier(field.streak);
  field.score += points * times;
  field.streakPoints += points * (times - 1);
}

/** Lengthens the streak by a brick broken, then scores the hit that broke it. */
export function scoreBreak(
  field: Field,
  brick: Readonly<Brick>,
  taken: number,
): void {
  field.streak++;
  scoreHit(field, brick, taken);
}

/** Starts the streak again, as the paddle meets a ball or the last ball is lost. */
export function endStreak(field: Field): void {
  field.streak = 0;
}

/** Returns what clearing a level adds, more for one cleared without losing a life. */
export function clearingPoints(livesLost: number): number {
  return CLEAR_POINTS + (livesLost === 0 ? CLEAN_POINTS : 0);
}
