// Brick Fuzz Pop's palette: the colors every wall game's field is drawn
// in, from `@fz/brick-wall/view/palette`, and its own kinds' inks, a
// prism's rays, the meter, the gauge and the friends.

import { TINT, type TintName, inkAt } from "@fz/brick-wall/view/inks";
import {
  type KindInks,
  type PaletteRoles,
  type WallPalette as WallColors,
  wallPalette as wallColors,
} from "@fz/brick-wall/view/palette";
import { FUZZBALL_INKS, colorNumber, mixColors } from "@fz/phaser/color";
import type { ColorMode } from "@fz/style/themes";

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

/**
 * Describes the field's colors, as the numbers Phaser takes: those every
 * wall game draws in, and Brick Fuzz Pop's kinds, prism, meter and friends.
 *
 * Its kinds draw in the shared colors too: a zapper's tile in the `line`,
 * a plate and a cage's bars in `steel`, a prism's triangle and a cross
 * zapper's diamond in the `text`, and a bomb's spark and a wool brick's
 * bolt in the `spark`.
 */
export interface WallPalette extends WallColors {
  /** Each special kind's inks, as its art gives them. */
  readonly kinds: Readonly<Record<InkedKind, KindInks>>;
  /** Each pair of portals' inks: the first pair's ring violet, the second's teal. */
  readonly portals: readonly [KindInks, KindInks];
  /** A prism's three rays, in red, amber and blue. */
  readonly rays: readonly [number, number, number];
  /** The meter's pips, lit in the warning color and unlit in the field's muted text. */
  readonly meter: { readonly on: number; readonly off: number };
  /**
   * The gauge over an aiming finger, whose pips are the meter's: its plate
   * in the lintel's color, the band's, and the plate's rim, the
   * field's muted text at {@link GAUGE_RIM_WASH}.
   */
  readonly gauge: { readonly plate: number; readonly rim: number };
  /** Each friend's ink, by the ink it was freed with: the {@link FUZZBALL_INKS} of the palette's mode. */
  readonly friends: readonly number[];
}

/**
 * How much steel a cage's inside takes over the field, little enough that
 * the cage's bars, in the library's steel, keep 3:1 against it.
 */
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

/** How much of the field's muted text the gauge's rim takes over the field: a faint edge round its plate, which no rule of contrast covers. */
export const GAUGE_RIM_WASH = 0.6;

const WHITE = 0xffffff;
const BLACK = 0x000000;

/** Returns the field's colors in a palette's roles, with the inks of its mode. */
export function wallPalette(roles: PaletteRoles, mode: ColorMode): WallPalette {
  const colors = wallColors(roles, mode);
  const { field, line, band, mark, tints, steel, text } = colors;
  const page = colorNumber(roles.page);
  const accent = colorNumber(roles.accent);
  const danger = colorNumber(roles.danger);
  const warning = colorNumber(roles.warning);
  const ink = (name: TintName): number => inkAt(tints, TINT[name]);
  const muted = colorNumber(roles.fieldMuted);
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
    ...colors,
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
    meter: { on: warning, off: muted },
    gauge: { plate: band, rim: mixColors(muted, field, GAUGE_RIM_WASH) },
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
