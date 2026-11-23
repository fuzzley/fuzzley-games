// The tiles' inks a wall game's bricks take from `@fz/phaser/color`, by
// name, and the ink at a place in a list of them.

/** The tiles' inks by name, each its place in `@fz/phaser/color`'s `TILE_INKS`. */
export const TINT = {
  red: 0,
  orange: 1,
  amber: 2,
  green: 3,
  teal: 4,
  blue: 5,
  violet: 6,
  pink: 7,
} as const;

/** A tile's ink by name, such as "teal". */
export type TintName = keyof typeof TINT;

/**
 * Returns the ink at a place in a list of inks, such as a palette's tints by
 * a brick's tint.
 *
 * @throws {RangeError} for a place the list hasn't.
 */
export function inkAt(inks: readonly number[], at: number): number {
  const ink = inks[at];
  if (ink === undefined) {
    throw new RangeError(`No ink at ${String(at)}`);
  }
  return ink;
}
