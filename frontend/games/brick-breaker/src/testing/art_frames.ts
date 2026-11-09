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

/** The scale the art's specs draw at, a field unit of 24 device pixels at 2 to a CSS pixel. */
export const ART_SCALE: ArtScale = { unit: 24, pixelRatio: 2 };

/**
 * The atlas's frames in the specs' palette, at their scale, among which a
 * spec finds one by its name with `@fz/phaser/testing/pure`'s `frameNamed()`.
 */
export const ART_FRAMES: readonly ArtFrame[] = atlasFrames(
  ART_PALETTE,
  ART_SCALE,
);
