// The inks the field takes from `@fz/phaser/color`: the tiles', which a
// plain or tough brick takes by its tint and the special kinds by name, and
// the fuzzballs', which a friend takes by its ink.

import { FUZZBALL_INKS } from "@fz/phaser/color";
import type { ColorMode } from "@fz/style/themes";

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
 * a brick's tint or its friends by the ink a friend was freed with.
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

/**
 * Returns a friend's ink in a palette's mode, by the ink it was freed with,
 * 0 to 7, for the shell to write as CSS with `cssHex()`.
 *
 * @throws {RangeError} for an ink no friend has.
 */
export function friendInk(ink: number, mode: ColorMode): number {
  return inkAt(FUZZBALL_INKS[mode], ink);
}
