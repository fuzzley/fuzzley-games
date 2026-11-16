// The tones a rock's marks are drawn in, from its ink, as the art kit's
// `tonesOf()` (`docs/archive/asteroid-breaker-uplift/art/lib/palettes.mjs`)
// mixes them: each a mix of the ink with white, or with the palette's field or
// its text, so the marks add no color to a palette.

import { clamp, lerp } from "@fz/core/math";
import type { ColorMode } from "@fz/style/themes";

/** Describes the four tones a rock's marks are drawn in, darkest last. */
export interface Tones {
  /** Where the light falls full. */
  readonly lit: number;
  /** Its own ink, where the light falls as on a face turned to the viewer. */
  readonly ink: number;
  /** Turned from the light. */
  readonly shade: number;
  /** Turned away from it. */
  readonly deep: number;
}

/** Describes what of a palette a thing's tones are mixed with: its mode, its field and its field's text. */
export interface ToneGround {
  readonly mode: ColorMode;
  readonly field: number;
  readonly text: number;
}

/**
 * Returns a color a share of the way from one to another, each channel
 * rounded, as the kit mixes them, so a tone is the kit's to the last bit;
 * `@fz/phaser/color`'s `mixColors()` weighs the two the other way about,
 * which rounds a channel differently now and then.
 */
export function mixTone(from: number, to: number, share: number): number {
  const channel = (shift: number): number =>
    clamp(
      Math.round(lerp((from >> shift) & 0xff, (to >> shift) & 0xff, share)),
      0,
      0xff,
    );
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

/** How much white the lit tone takes, and how much of the ground the shade and the deep take, in each mode. */
const TONE_MIXES: Readonly<
  Record<
    ColorMode,
    { readonly lit: number; readonly shade: number; readonly deep: number }
  >
> = {
  light: { lit: 0.3, shade: 0.3, deep: 0.52 },
  dark: { lit: 0.42, shade: 0.44, deep: 0.66 },
};

/**
 * Returns the tones a rock's marks are drawn in, from its ink. In a light
 * palette the ink is already the darkest a thing may be against a white
 * field and still read as its color, so the shade sinks toward the field's
 * text; in a dark palette the shade sinks toward the field and takes a
 * little of its hue, as a rock's dark side does in space.
 */
export function tonesOf(ink: number, ground: ToneGround): Tones {
  const mixes = TONE_MIXES[ground.mode];
  const under = ground.mode === "light" ? ground.text : ground.field;
  return {
    lit: mixTone(ink, 0xffffff, mixes.lit),
    ink,
    shade: mixTone(ink, under, mixes.shade),
    deep: mixTone(ink, under, mixes.deep),
  };
}
