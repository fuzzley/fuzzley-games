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

/** Adds a hit on a brick to the level's score: its kind's points, times the streak's multiplier. */
export function scoreHit(field: Field, brick: Readonly<Brick>): void {
  field.score += brickKind(brick.kind).points * multiplier(field.streak);
}

/** Returns what clearing a level adds, more for one cleared without losing a ball. */
export function clearingPoints(livesLost: number): number {
  return CLEAR_POINTS + (livesLost === 0 ? CLEAN_POINTS : 0);
}
