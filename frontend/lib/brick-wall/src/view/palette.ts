// The colors every wall game draws its field in, from the palette's roles,
// which a game spreads into its own palette beside its kinds' inks.

import { TILE_INKS, colorNumber, mixColors } from "@fz/phaser/color";
import type { ColorMode, PaletteRole } from "@fz/style/themes";

/** Describes the palette roles the field is drawn in, as the page sets them, in hex. */
export interface PaletteRoles {
  readonly field: string;
  readonly fieldLine: string;
  readonly fieldText: string;
  readonly fieldMuted: string;
  readonly page: string;
  readonly accent: string;
  readonly danger: string;
  readonly warning: string;
}

/** The page's role for each of the colors the field is drawn in. */
export const FIELD_ROLES: Readonly<Record<keyof PaletteRoles, PaletteRole>> = {
  field: "field",
  fieldLine: "field-line",
  fieldText: "field-text",
  fieldMuted: "field-muted",
  page: "page",
  accent: "accent",
  danger: "danger",
  warning: "warning",
};

/** Describes the colors a special kind of brick is drawn in. */
export interface KindInks {
  /**
   * What tells it from the field, and what its shards take: its tile, or
   * its outline or ring where it has none of its own.
   */
  readonly body: number;
  /** What its glyph is drawn on: its body, or what lies inside its outline or its ring. */
  readonly face: number;
  /** The mark that tells its kind. */
  readonly glyph: number;
}

/** Describes the colors every wall game's field is drawn in, as the numbers Phaser takes. */
export interface WallPalette {
  /** The field under everything: the palette's field. */
  readonly field: number;
  /** The field's frame and the dots of its grid: the field's line. */
  readonly line: number;
  /** The floor's band and the lintel over the ceiling: the field's text at {@link BAND_WASH}. */
  readonly band: number;
  /**
   * The marks cut out of what they are drawn on, such as a brick's pips
   * and cracks and every fuzzball's eyes. It is the field's color, which
   * each keeps 3:1 from.
   */
  readonly mark: number;
  /** The tints a plain or tough brick takes, 0 to 7: the `TILE_INKS` of the palette's mode. */
  readonly tints: readonly number[];
  /** A steel brick and a plate of steel: the field's text at {@link STEEL_WASH}. */
  readonly steel: number;
  /** The player's fuzzball: the accent. */
  readonly fuzzball: number;
  /** The hot shot: the danger color. */
  readonly hotShot: number;
  /** Sparks and flames, such as the hot shot's: the warning color. */
  readonly spark: number;
  /** The guide, the clearest thing on the field: the field's {@link text}. */
  readonly guide: number;
  /** The field's text, which the lintel's count of the rows waiting is written in. */
  readonly text: number;
  /** The jump line: the accent. */
  readonly jumpLine: number;
  /** The danger line: the danger color. */
  readonly dangerLine: number;
}

/** How much of the field's text the floor's band and the lintel take over the field. */
export const BAND_WASH = 0.13;

/** How much of the field's text steel takes over the field: enough for 3:1 against it in every palette. */
export const STEEL_WASH = 0.6;

/** Returns the colors every wall game's field is drawn in, in a palette's roles, with the inks of its mode. */
export function wallPalette(roles: PaletteRoles, mode: ColorMode): WallPalette {
  const field = colorNumber(roles.field);
  const text = colorNumber(roles.fieldText);
  const accent = colorNumber(roles.accent);
  const danger = colorNumber(roles.danger);
  return {
    field,
    line: colorNumber(roles.fieldLine),
    band: mixColors(text, field, BAND_WASH),
    mark: field,
    tints: TILE_INKS[mode],
    steel: mixColors(text, field, STEEL_WASH),
    fuzzball: accent,
    hotShot: danger,
    spark: colorNumber(roles.warning),
    guide: text,
    text,
    jumpLine: accent,
    dangerLine: danger,
  };
}
