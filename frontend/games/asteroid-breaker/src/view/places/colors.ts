import { clamp } from "@fz/core/math";
import { mixColors } from "@fz/phaser/color";
import type { ColorMode } from "@fz/style/themes";
import type { BeltPalette } from "../colors/palette";
import type { Depth } from "../field/specks";

// A place is mixed from the palette's own colors and the game's inks, a
// little of one into the field's color, never a color of its own, so each
// palette shows each place in its own colors and nothing in it stands out as
// a thing in play does (`art/README.md`, "The field stays quiet").

/** Names a rock's ink a place mixes in. */
export type RockTint =
  "stone" | "ice" | "crystal" | "iron" | "volatile" | "lodestone";

/**
 * Names the color a mark of a place mixes into the field: a role of the
 * palette (`text` and `muted` the field's), a rock's ink or a pilot's
 * (`blue`, `violet`); `deep`, the page behind the field in a dark palette
 * and the field's muted text in a light one; `cloud`, a cloud's own body,
 * the field sunk toward the page in a dark palette and the paper itself in a
 * light one; and `spark`, a volatile rock's glowing core.
 */
export type Tint =
  | "accent"
  | "danger"
  | "warning"
  | "text"
  | "muted"
  | "deep"
  | "cloud"
  | "spark"
  | "blue"
  | "violet"
  | RockTint;

/** Says what a place is mixed from: the palette's colors that a place takes, and the game's inks. */
export interface PlaceColors {
  readonly mode: ColorMode;
  readonly field: number;
  readonly page: number;
  readonly text: number;
  readonly muted: number;
  readonly accent: number;
  readonly danger: number;
  readonly warning: number;
  readonly rocks: Readonly<Record<RockTint, number>>;
  /** A volatile rock's glowing core. */
  readonly core: number;
  /** The blue pilot's ink. */
  readonly blue: number;
  /** The violet pilot's ink. */
  readonly violet: number;
}

/** Says how much of another color each kind of mark may mix into the field, in a mode of palette. */
export interface Limits {
  /** The far wash and the vignette, each larger than a boulder. */
  readonly wash: number;
  /** The landmark's faces, billows and glows, each larger than a boulder. */
  readonly landmark: number;
  /** What only sinks a dark field toward the page behind it, as a wash or a landmark's. */
  readonly deep: number;
  /** A line a hair wide. */
  readonly line: number;
  /** A mote or a filing, smaller than a small rock. */
  readonly small: number;
}

/** The kinds of mark a place holds to a limit of its own. */
export type LimitKind = Exclude<keyof Limits, "deep">;

/**
 * How much of another color a place's marks may mix into the field, by the
 * palette's mode: a tenth at most of anything large in a dark palette and a
 * twentieth of a light one's wash, so nothing large stands out from the
 * field by more than 1.3 to 1.
 */
export const LIMITS: Readonly<Record<ColorMode, Limits>> = {
  dark: { wash: 0.1, landmark: 0.1, deep: 0.5, line: 0.16, small: 0.26 },
  light: { wash: 0.05, landmark: 0.1, deep: 0.05, line: 0.1, small: 0.18 },
};

/**
 * How much of the field's muted text a star of each depth mixes into the
 * field, by the palette's mode; a bright star in a dark palette takes the
 * field's text instead.
 */
export const STAR_SHARES: Readonly<
  Record<ColorMode, Readonly<Record<Depth, number>>>
> = {
  dark: { far: 0.24, mid: 0.46, bright: 0.54 },
  light: { far: 0.2, mid: 0.38, bright: 0.56 },
};

/** How much of a sector's tint a star takes. */
const STAR_TINT = 0.22;

/** Says a hard landmark's four tones: deep, shade, ink and lit. */
export type Tones = readonly [number, number, number, number];

/**
 * How a hard face's share of the landmark's limit follows the light on it,
 * through its four tones. In a dark palette its deep tone is no tint but the
 * field sunk toward the page, as the far side of a planet is darker than the
 * sky; in a light one its lit tone is the paper itself.
 */
const HARD_STEPS: Readonly<Record<ColorMode, Tones>> = {
  dark: [0, 0.16, 0.56, 1],
  light: [1, 0.7, 0.42, 0.14],
};

/** How far a cloud's body, and a hard face's deep tone, sink a dark field toward the page, against `deep`'s limit. */
const SUNK = 0.9;

/** How much white a hard face's ink takes to be lit in a dark palette, and how much of the field's text to be deep in a light one. */
const HARD_LIGHT = { dark: 0.42, light: 0.52 } as const;

/** How much of a volatile rock's ink its core takes for a spark in a light palette, where the core alone is too pale. */
const SPARK_INK = 0.35;

/** The blue pilot's and the violet pilot's places among the pilots' inks. */
const PILOT_TINTS = { blue: 5, violet: 6 } as const;

/** Returns a color a share of the way from one to another. */
export function mix(from: number, to: number, share: number): number {
  return mixColors(to, from, share);
}

/**
 * Returns what a place is mixed from in a palette: its roles and its inks,
 * the field's text being the shots', its danger the comet's and its warning
 * the flame's.
 *
 * @throws {RangeError} For a palette with no blue or violet pilot.
 */
export function placeColors(palette: BeltPalette): PlaceColors {
  const pilot = (at: number): number => {
    const ink = palette.pilots[at];
    if (ink === undefined) throw new RangeError(`No pilot ${String(at)}.`);
    return ink;
  };
  const { stone, ice, crystal, iron, volatile, lodestone } = palette.rocks;
  return {
    mode: palette.mode,
    field: palette.field,
    page: palette.page,
    text: palette.shot,
    muted: palette.muted,
    accent: palette.accent,
    danger: palette.comet,
    warning: palette.flame,
    rocks: { stone, ice, crystal, iron, volatile, lodestone },
    core: palette.core,
    blue: pilot(PILOT_TINTS.blue),
    violet: pilot(PILOT_TINTS.violet),
  };
}

/** Returns the color a tint names in a palette. */
export function tintOf(tint: Tint, colors: PlaceColors): number {
  const dark = colors.mode === "dark";
  switch (tint) {
    case "accent":
    case "danger":
    case "warning":
    case "text":
    case "muted":
    case "blue":
    case "violet":
      return colors[tint];
    case "deep":
      return dark ? colors.page : colors.muted;
    case "cloud":
      return dark
        ? mix(colors.field, colors.page, SUNK * LIMITS.dark.deep)
        : colors.field;
    case "spark":
      return dark
        ? colors.core
        : mix(colors.core, colors.rocks.volatile, SPARK_INK);
    default:
      return colors.rocks[tint];
  }
}

/** Returns how much of a tint a mark of a kind takes at its strongest, at a strength, a share of its limit. */
export function shareOf(
  tint: Tint,
  strength: number,
  kind: LimitKind,
  colors: PlaceColors,
): number {
  const limits = LIMITS[colors.mode];
  const deep = tint === "deep" && (kind === "wash" || kind === "landmark");
  return strength * (deep ? limits.deep : limits[kind]);
}

/**
 * Returns the color a hard mark's tint mixes into the field, and a line's
 * own: the ink lit toward white in a dark palette, and sunk toward the
 * field's text in a light one, as ink on paper.
 */
export function hardOther(tint: Tint, colors: PlaceColors): number {
  const ink = tintOf(tint, colors);
  return colors.mode === "dark"
    ? mix(ink, 0xffffff, HARD_LIGHT.dark)
    : mix(ink, colors.text, HARD_LIGHT.light);
}

/**
 * Returns the four tones a hard landmark is cut in: the field with a little
 * of the ink's lit tone in a dark palette, most where the light falls, and
 * of its deep tone in a light one, most in its shade.
 */
export function hardTones(tint: Tint, colors: PlaceColors): Tones {
  const other = hardOther(tint, colors);
  const { landmark, deep } = LIMITS[colors.mode];
  const toned = (step: number): number =>
    mix(colors.field, other, step * landmark);
  const [deepest, shade, ink, lit] = HARD_STEPS[colors.mode];
  return [
    colors.mode === "dark"
      ? mix(colors.field, colors.page, SUNK * deep)
      : toned(deepest),
    toned(shade),
    toned(ink),
    toned(lit),
  ];
}

/**
 * Returns the tone of a face under a light, from 0.3, unlit, to a little
 * over 1, between a hard landmark's four.
 */
export function toneUnder(
  light: number,
  [deep, shade, ink, lit]: Tones,
): number {
  const at = clamp((light - 0.3) / 0.82, 0, 1) * 3;
  if (at < 1) return mix(deep, shade, at);
  if (at < 2) return mix(shade, ink, at - 1);
  return mix(ink, lit, at - 2);
}

/** Returns the color of a small hard mark, a filing, under a light: the field with a little of its tint. */
export function smallTone(
  light: number,
  tint: Tint,
  colors: PlaceColors,
): number {
  const share = LIMITS[colors.mode].small * clamp(light, 0.4, 1.1);
  return mix(colors.field, hardOther(tint, colors), share);
}

/**
 * Returns the color of a star of a depth, with a little of a sector's tint: a
 * pale speck on a dark field, a dark one on a light field.
 */
export function starColor(
  depth: Depth,
  tint: Tint,
  colors: PlaceColors,
): number {
  const base =
    depth === "bright" && colors.mode === "dark" ? colors.text : colors.muted;
  const tinted = mix(base, tintOf(tint, colors), STAR_TINT);
  return mix(colors.field, tinted, STAR_SHARES[colors.mode][depth]);
}
