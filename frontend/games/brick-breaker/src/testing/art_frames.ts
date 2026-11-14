import type { ArtFrame, ArtScale } from "@fz/phaser/shapes";
import { atlasFrames } from "../view/art/art";
import { type PaletteRoles, bricksPalette } from "../view/colors/palette";

/** The roles the art's specs draw in, each a color no other role takes. */
const ROLES: PaletteRoles = {
  panel: "#f1f3f5",
  text: "#1b1f24",
  accent: "#2f7d4f",
  danger: "#c62828",
  warning: "#a84b06",
};

/** The palette the art's specs draw in, a light one. */
export const ART_PALETTE = bricksPalette(ROLES, "light");

/**
 * The scale the art's specs draw at, a field unit of 40 device pixels at 2
 * to a CSS pixel: a brick 40 CSS pixels wide, about as a window of 1280 by
 * 720 draws one, in full detail.
 */
export const ART_SCALE: ArtScale = { unit: 40, pixelRatio: 2 };

/**
 * A scale a brick is drawn too small at for its finest detail: a field unit
 * of 24 device pixels at 2 to a CSS pixel, a brick 24 CSS pixels wide, as a
 * phone on its side draws one.
 */
export const SMALL_SCALE: ArtScale = { unit: 24, pixelRatio: 2 };

/** The scales a field is drawn at, from the smallest unit the layout allows to a large one at a pixel ratio of 3, the two above among them. */
export const FIELD_SCALES: readonly ArtScale[] = [
  { unit: 10, pixelRatio: 1 },
  { unit: 13, pixelRatio: 1.25 },
  SMALL_SCALE,
  ART_SCALE,
  { unit: 54, pixelRatio: 3 },
];

/**
 * The atlas's frames in the specs' palette, at their scale, among which a
 * spec finds one by its name with `@fz/phaser/testing/pure`'s `frameNamed()`.
 */
export const ART_FRAMES: readonly ArtFrame[] = atlasFrames(
  ART_PALETTE,
  ART_SCALE,
);
