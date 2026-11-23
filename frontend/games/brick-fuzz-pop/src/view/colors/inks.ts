// The inks a friend takes from `@fz/phaser/color`'s fuzzballs, by the ink
// it was freed with. The tiles' inks by name are
// `@fz/brick-wall/view/inks`'s.

import { inkAt } from "@fz/brick-wall/view/inks";
import { FUZZBALL_INKS } from "@fz/phaser/color";
import type { ColorMode } from "@fz/style/themes";

/**
 * Returns a friend's ink in a palette's mode, by the ink it was freed with,
 * 0 to 7, for the shell to write as CSS with `cssHex()`.
 *
 * @throws {RangeError} for an ink no friend has.
 */
export function friendInk(ink: number, mode: ColorMode): number {
  return inkAt(FUZZBALL_INKS[mode], ink);
}
