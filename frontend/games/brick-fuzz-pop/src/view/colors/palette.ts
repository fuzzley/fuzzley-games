import {
  FUZZBALL_INKS,
  TILE_INKS,
  colorNumber,
  mixColors,
} from "@fz/phaser/color";
import type { ColorMode, PaletteRole } from "@fz/style/themes";
import { TINT, type TintName, inkAt } from "./inks";

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

/**
 * The special kinds of brick that keep inks of their own in one look, rather
 * than their row's tint, by the catalog's ids: every kind but the brick, the
 * tough brick and the portal, whose two pairs keep theirs in
 * {@link WallPalette.portals}.
 */
export type InkedKind =
  | "steel"
  | "rowZapper"
  | "columnZapper"
  | "crossZapper"
  | "xZapper"
  | "bomb"
  | "wool"
  | "cage"
  | "bumper"
  | "prism"
  | "plated"
  | "shell"
  | "moss";

/** Describes the colors a special kind of brick is drawn in. */
export interface KindInks {
  /**
   * What tells it from the field, and what its shards take: its tile, or
   * its outline or ring where it has none of its own.
   */
  readonly body: number;
  /** What its glyph is drawn on: its body, or what lies inside its outline, its ring or its shell. */
  readonly face: number;
  /** The mark that tells its kind. */
  readonly glyph: number;
}

/** Describes the field's colors, as the numbers Phaser takes. */
export interface WallPalette {
  /** The field under everything: the palette's field, where Brick Breaker's takes its panel. */
  readonly field: number;
  /** The field's frame, the dots of its grid and a zapper's tile: the field's line. */
  readonly line: number;
  /** The floor's band and the lintel over the ceiling: the field's text at {@link BAND_WASH}. */
  readonly band: number;
  /**
   * The marks cut out of what they are drawn on: a brick's pips and cracks,
   * the glyphs of the kinds whose {@link KindInks.glyph} it is, and every
   * fuzzball's eyes. It is the field's color, which each keeps 3:1 from.
   */
  readonly mark: number;
  /** The tints a plain or tough brick takes, 0 to 7: the {@link TILE_INKS} of the palette's mode. */
  readonly tints: readonly number[];
  /** A steel brick, a plate and a cage's bars: the field's text at {@link STEEL_WASH}. */
  readonly steel: number;
  /** Each special kind's inks, as its art gives them. */
  readonly kinds: Readonly<Record<InkedKind, KindInks>>;
  /** Each pair of portals' inks: the first pair's ring violet, the second's teal. */
  readonly portals: readonly [KindInks, KindInks];
  /** A prism's three rays, in red, amber and blue. */
  readonly rays: readonly [number, number, number];
  /** The player's fuzzball, and the triple shot's three: the accent. */
  readonly fuzzball: number;
  /** The hot shot: the danger color. */
  readonly hotShot: number;
  /** A full charge's sparks, the hot shot's flames, a bomb's spark and a wool brick's bolt: the warning color. */
  readonly spark: number;
  /**
   * The guide's dots and its arrow, and the outline round each brick it
   * punches through, the clearest things on the field: the field's
   * {@link text}.
   */
  readonly guide: number;
  /** The field's text, which a prism's triangle and a cross zapper's diamond are drawn in too. */
  readonly text: number;
  /** The jump line: the accent. */
  readonly jumpLine: number;
  /** The danger line: the danger color. */
  readonly dangerLine: number;
  /** The meter's pips, lit in the warning color and unlit in the field's muted text. */
  readonly meter: { readonly on: number; readonly off: number };
  /** Each friend's ink, by the ink it was freed with: the {@link FUZZBALL_INKS} of the palette's mode. */
  readonly friends: readonly number[];
}

/** How much of the field's text the floor's band and the lintel take over the field. */
export const BAND_WASH = 0.13;

/**
 * How much of the field's text steel takes over the field: enough for 3:1
 * against the field in every palette, and for a cage's bars against its
 * inside.
 */
export const STEEL_WASH = 0.6;

/** How much steel a cage's inside takes over the field. */
export const CAGE_WASH = 0.21;

/** How much of the field's text a prism's glass takes over the field. */
export const GLASS_WASH = 0.12;

/** How much of the field's text a prism's edge takes over the field, enough for 3:1 against it. */
export const EDGE_WASH = 0.58;

/**
 * How far a shell brick's shell is lightened toward white from its ink in a
 * dark palette, and its core darkened toward black in a light one.
 */
export const SHELL_SHADE = 0.42;

/** How much white a moss brick's cap takes over its green, in each mode. */
export const MOSS_LIGHT: Readonly<Record<ColorMode, number>> = {
  light: 0.12,
  dark: 0.3,
};

/** How much of the field's text a portal's arms and badge take over its ring's ink. */
export const PORTAL_GLOW = 0.34;

const WHITE = 0xffffff;
const BLACK = 0x000000;

/** Returns the field's colors in a palette's roles, with the inks of its mode. */
export function wallPalette(roles: PaletteRoles, mode: ColorMode): WallPalette {
  const field = colorNumber(roles.field);
  const line = colorNumber(roles.fieldLine);
  const text = colorNumber(roles.fieldText);
  const page = colorNumber(roles.page);
  const accent = colorNumber(roles.accent);
  const danger = colorNumber(roles.danger);
  const warning = colorNumber(roles.warning);
  const mark = field;
  const tints = TILE_INKS[mode];
  const ink = (name: TintName): number => inkAt(tints, TINT[name]);
  const steel = mixColors(text, field, STEEL_WASH);
  const zapper: KindInks = { body: warning, face: line, glyph: warning };
  const portal = (name: TintName): KindInks => {
    const ring = ink(name);
    return {
      body: ring,
      face: page,
      glyph: mixColors(text, ring, PORTAL_GLOW),
    };
  };
  return {
    field,
    line,
    band: mixColors(text, field, BAND_WASH),
    mark,
    tints,
    steel,
    kinds: {
      steel: { body: steel, face: steel, glyph: mark },
      rowZapper: zapper,
      columnZapper: zapper,
      crossZapper: zapper,
      xZapper: zapper,
      bomb: { body: danger, face: danger, glyph: mark },
      wool: { body: ink("pink"), face: ink("pink"), glyph: mark },
      cage: {
        body: steel,
        face: mixColors(steel, field, CAGE_WASH),
        glyph: steel,
      },
      bumper: { body: accent, face: accent, glyph: mark },
      prism: {
        body: mixColors(text, field, EDGE_WASH),
        face: mixColors(text, field, GLASS_WASH),
        glyph: text,
      },
      // A plate stands on a gap of the field, clear of the brick it armors.
      plated: { body: ink("orange"), face: field, glyph: steel },
      shell: shellInks(ink("teal"), mode, mark),
      moss: {
        body: ink("amber"),
        face: mixColors(WHITE, ink("green"), MOSS_LIGHT[mode]),
        glyph: mark,
      },
    },
    portals: [portal("violet"), portal("teal")],
    rays: [ink("red"), ink("amber"), ink("blue")],
    fuzzball: accent,
    hotShot: danger,
    spark: warning,
    guide: text,
    text,
    jumpLine: accent,
    dangerLine: danger,
    meter: { on: warning, off: colorNumber(roles.fieldMuted) },
    friends: FUZZBALL_INKS[mode],
  };
}

/**
 * Returns a shell brick's inks: a shell lighter than its core in either
 * mode, its ink kept for whichever of the two would lose its contrast with
 * the field, and its bolt and pips cut out of the core.
 */
function shellInks(ink: number, mode: ColorMode, mark: number): KindInks {
  return mode === "dark"
    ? { body: mixColors(WHITE, ink, SHELL_SHADE), face: ink, glyph: mark }
    : { body: ink, face: mixColors(BLACK, ink, SHELL_SHADE), glyph: mark };
}
