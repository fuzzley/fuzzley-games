// Rickashay's palette: the colors every wall game's field is drawn in, from
// `@fz/brick-wall/view/palette`, and its own, after the design's art: the
// floor bounces' springs, the rally's number, the rings at the guide's
// turns, the streak a fuzzball's dash home leaves, a hatch's chevrons, a
// portal's eye and a moss brick's cap. The hot shot is the library's
// `hotShot` and `spark`.

import {
  type PaletteRoles as WallRoles,
  FIELD_ROLES as WALL_ROLES,
  type WallPalette as WallColors,
  wallPalette as wallColors,
} from "@fz/brick-wall/view/palette";
import { TINT, inkAt } from "@fz/brick-wall/view/inks";
import { colorNumber, mixColors } from "@fz/phaser/color";
import type { ColorMode, PaletteRole } from "@fz/style/themes";

/** Describes the palette roles the field is drawn in, as the page sets them, in hex: every wall game's. */
export type PaletteRoles = WallRoles;

/** The page's role for each of the colors the field is drawn in, which the shell reads the roles by. */
export const FIELD_ROLES: Readonly<Record<keyof PaletteRoles, PaletteRole>> =
  WALL_ROLES;

/**
 * Describes the field's colors, as the numbers Phaser takes: those every
 * wall game draws in, and Rickashay's springs, rally, guide's rings,
 * streak, hatch's chevrons, portal's eye and moss brick's cap.
 */
export interface WallPalette extends WallColors {
  /**
   * A floor bounce's spring in the floor's band: grey, in the field's
   * muted text, until it is earned, and lit in the warning color while it
   * is held.
   */
  readonly springs: { readonly off: number; readonly on: number };
  /**
   * The rally's number, small and faint, under the danger line: the
   * field's text, shown at part strength, its `alpha`, as `RALLY_ALPHA`
   * says.
   */
  readonly rally: { readonly color: number; readonly alpha: number };
  /** The ring at each of the guide's turns, in the guide's color. */
  readonly guideRing: number;
  /** The streak a fuzzball's dash home leaves, in its own color: the fuzzball's, or the hot shot's. */
  readonly streak: { readonly plain: number; readonly hot: number };
  /**
   * The chevrons under a hatch's bar, pointing the way a fuzzball passes
   * it, and an open hatch's two leaves, hanging down at its sides as posts,
   * each drawn on the field: the field's muted text, quieter than the
   * bar's steel.
   */
  readonly chevrons: number;
  /** A portal's eye, inside its ring: the page's color, as the design's art draws it. */
  readonly portalEye: number;
  /**
   * A moss brick's cap, which its sprout is cut out of in the marks'
   * color: the green tile's ink with 0.12 of white over it in a light
   * palette and 0.3 in a dark one, as the design's art draws it.
   */
  readonly mossCap: number;
}

/** How much white a moss brick's cap takes over the green tile's ink, in each mode: the art's. */
const MOSS_LIGHT: Readonly<Record<ColorMode, number>> = {
  light: 0.12,
  dark: 0.3,
};

/**
 * How strongly the rally's number shows over the field, in each mode:
 * fainter than the field's text, yet keeping 4.5:1 against the field, the
 * bar the accessibility rules set for all text, as on a small phone on its
 * side its digits stand about 17 CSS pixels tall.
 */
const RALLY_ALPHA: Readonly<Record<ColorMode, number>> = {
  light: 0.65,
  dark: 0.55,
};

/** Returns the field's colors in a palette's roles, with the inks of its mode. */
export function wallPalette(roles: PaletteRoles, mode: ColorMode): WallPalette {
  const colors = wallColors(roles, mode);
  const warning = colorNumber(roles.warning);
  return {
    ...colors,
    springs: { off: colorNumber(roles.fieldMuted), on: warning },
    rally: { color: colors.text, alpha: RALLY_ALPHA[mode] },
    guideRing: colors.guide,
    streak: { plain: colors.fuzzball, hot: colors.hotShot },
    chevrons: colorNumber(roles.fieldMuted),
    portalEye: colorNumber(roles.page),
    mossCap: mixColors(
      0xffffff,
      inkAt(colors.tints, TINT.green),
      MOSS_LIGHT[mode],
    ),
  };
}
