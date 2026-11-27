// The palette and the scale the art's specs draw in.

import type { ArtScale } from "@fz/phaser/shapes";
import { type BoardRoles, boardPalette } from "../view/colors/palette";

/** The roles the art's specs draw in, each a color no other role takes, so a spec sees which one the art reads. */
export const ART_ROLES: BoardRoles = {
  page: "#f6f6f6",
  panel: "#e8e8e8",
  text: "#202020",
  muted: "#666666",
  warning: "#a84b06",
};

/** The palette the art's specs draw in, a light one. */
export const ART_PALETTE = boardPalette(ART_ROLES, "light");

/** The scale the art's specs draw at: a square 100 device pixels across, a pixel to each of the design's units, at 2 device pixels to a CSS pixel. */
export const ART_SCALE: ArtScale = { unit: 100, pixelRatio: 2 };

/** The smallest square the board lays out, 40 CSS pixels, at 2 device pixels to one, where the art's least lines are held to a CSS pixel. */
export const SMALLEST_SCALE: ArtScale = { unit: 40 * 2, pixelRatio: 2 };

/**
 * Returns a number to a billionth, so two worked out alike but for a
 * rounding, such as a point round a curve, are equal.
 */
export function billionths(n: number): number {
  // Adding 0 turns -0 into 0, which a deep equality tells apart.
  return Number(n.toFixed(9)) + 0;
}
