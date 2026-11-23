// Rickashay's palette: the colors every wall game's field is drawn in, from
// `@fz/brick-wall/view/palette`, and its own, after the design's art: the
// floor bounces' springs, the rally's pill, the rings at the guide's turns
// and the streak a fuzzball's dash home leaves. The hot shot is the
// library's `hotShot` and `spark`.

import {
  type PaletteRoles as WallRoles,
  FIELD_ROLES as WALL_ROLES,
  type WallPalette as WallColors,
  wallPalette as wallColors,
} from "@fz/brick-wall/view/palette";
import { colorNumber } from "@fz/phaser/color";
import type { ColorMode, PaletteRole } from "@fz/style/themes";

/**
 * Describes the palette roles the field is drawn in, as the page sets them,
 * in hex: every wall game's, and the text the palette sets on its warning
 * color, which the rally's number is written in.
 */
export interface PaletteRoles extends WallRoles {
  readonly onWarning: string;
}

/** The page's role for each of the colors the field is drawn in, which the shell reads the roles by. */
export const FIELD_ROLES: Readonly<Record<keyof PaletteRoles, PaletteRole>> = {
  ...WALL_ROLES,
  onWarning: "on-warning",
};

/**
 * Describes the field's colors, as the numbers Phaser takes: those every
 * wall game draws in, and Rickashay's springs, pill, guide's rings and
 * streak.
 */
export interface WallPalette extends WallColors {
  /**
   * A floor bounce's spring in the floor's band: grey, in the field's
   * muted text, until it is earned, and lit in the warning color while it
   * is held.
   *
   * The design's art greys it with less of the field's text, which keeps
   * under 3:1 against the band.
   */
  readonly springs: { readonly off: number; readonly on: number };
  /**
   * The pill the rally rides in beside the fuzzball, in the warning color,
   * and its number, in the text the palette sets on that color, which
   * `@fz/style` holds to 4.5:1 against it, where the design's art takes the
   * page's color.
   */
  readonly pill: { readonly fill: number; readonly text: number };
  /** The ring at each of the guide's turns, in the guide's color. */
  readonly guideRing: number;
  /** The streak a fuzzball's dash home leaves, in its own color: the fuzzball's, or the hot shot's. */
  readonly streak: { readonly plain: number; readonly hot: number };
}

/** Returns the field's colors in a palette's roles, with the inks of its mode. */
export function wallPalette(roles: PaletteRoles, mode: ColorMode): WallPalette {
  const colors = wallColors(roles, mode);
  const warning = colorNumber(roles.warning);
  return {
    ...colors,
    springs: { off: colorNumber(roles.fieldMuted), on: warning },
    pill: { fill: warning, text: colorNumber(roles.onWarning) },
    guideRing: colors.guide,
    streak: { plain: colors.fuzzball, hot: colors.hotShot },
  };
}
