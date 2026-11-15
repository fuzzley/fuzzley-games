// The light the rocks are lit by, far off to the upper left: one for a light
// palette and one for a dark, each set so a face toward the viewer shows its
// own ink and the faces the light falls on most and least keep 3:1 against
// the field (`contrast.spec.ts`); and what the light makes of an ink.

import { clamp } from "@fz/core/math";
import type { ColorMode } from "@fz/style/themes";
import type { RockLight } from "../art/rocks/light";

/**
 * The way across the field to the light, as the art kit's: from the upper
 * left, which the rocks and the places' landmarks are lit from.
 */
export const LIGHT_ACROSS = { x: -0.52, y: -0.62 } as const;

/**
 * Returns a light at a height, above 0, along the field, up to 1, straight
 * over it, along {@link LIGHT_ACROSS}, that leaves an ambient on a face turned
 * away from it and shows a face toward the viewer at 1, its own ink.
 */
export function lightAt(height: number, ambient: number): RockLight {
  const along = Math.hypot(LIGHT_ACROSS.x, LIGHT_ACROSS.y);
  const sideways = Math.sqrt(1 - height * height);
  return {
    way: {
      x: (LIGHT_ACROSS.x / along) * sideways,
      y: (LIGHT_ACROSS.y / along) * sideways,
      z: height,
    },
    ambient,
    intensity: (1 - ambient) / height,
  };
}

/**
 * The light in each mode. A light palette's field is white, so its rocks'
 * brightest faces may come only a little past their inks: the light stands
 * high, over the viewer's shoulder, and its faces turned away sink to about
 * half their ink, as the kit's deepest tone does. A dark palette's field is
 * dark, so its rocks' darkest faces may sink only a little under their inks:
 * the light stands low, raking across the field, and its faces turned to it
 * rise near the kit's brightest.
 */
export const ROCK_LIGHTS: Readonly<Record<ColorMode, RockLight>> = {
  light: lightAt(0.786, 0.486),
  dark: lightAt(0.365, 0.74),
};

/**
 * Returns an ink as a light of a strength shows it: each channel times the
 * strength, rounded and kept within a byte, as WebGL's lighting multiplies a
 * texel.
 */
export function inLight(ink: number, strength: number): number {
  const channel = (shift: number): number =>
    clamp(Math.round(((ink >> shift) & 0xff) * strength), 0, 0xff);
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

/** Describes the darkest and the brightest an ink shows on a rock's faces under a light. */
export interface FaceExtremes {
  /** On a face turned away from the light: the ink times the ambient. */
  readonly darkest: number;
  /** On a face turned straight at it: the ink times the ambient and the light. */
  readonly brightest: number;
}

/** Returns the darkest and the brightest an ink shows on a rock's faces under a light. */
export function faceExtremes(ink: number, light: RockLight): FaceExtremes {
  return {
    darkest: inLight(ink, light.ambient),
    brightest: inLight(ink, light.ambient + light.intensity),
  };
}

/**
 * Describes the light a held hit's flash lights its rock's struck faces
 * with: where it stands, at the rock's edge toward the ship, how high over
 * it, and how far it reaches, each in shares of the rock's radius, just
 * past the rock's far side, about two and a quarter across the field
 * from the struck edge, where a rock beside it is lit faintly; and how
 * strong it is at the flash's height, over the flash's alpha.
 */
export const STRUCK_LIGHT = {
  height: 1,
  reach: 2.5,
  strength: 2.7,
} as const;

/** How far off the field's light stands, in lengths of the field's longer side, so its way is the same at every rock. */
const FAR = 100;

/** How far the field's light reaches, in lengths of how far off it stands, so it fades nowhere on the field. */
const FAR_REACH = 1000;

/** Describes where a light stands over the canvas, in canvas pixels, and how far it reaches. */
export interface LightPlace {
  readonly x: number;
  readonly y: number;
  /** How high over the canvas it stands. */
  readonly z: number;
  readonly radius: number;
}

/**
 * Returns where the field's light stands for WebGL's lighting, which lights
 * from a point: far off along its way from the field's middle, so it falls
 * along that way, at full strength, on every rock.
 */
export function farLight(
  field: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  },
  light: RockLight,
): LightPlace {
  const off = FAR * Math.max(field.width, field.height);
  return {
    x: field.x + field.width / 2 + light.way.x * off,
    y: field.y + field.height / 2 + light.way.y * off,
    z: light.way.z * off,
    radius: FAR_REACH * off,
  };
}
