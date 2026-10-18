import { Size } from "../layout/geometry";
import {
  CARD_RENDER_HEIGHT_PX,
  CARD_RENDER_WIDTH_PX,
} from "../layout/card_metrics";

/**
 * The densities the card atlas is built at, in texels per design unit, from
 * least to most dense.
 *
 * Each is at most half as dense again as the one before, so the board, which
 * draws from the least dense atlas that need not enlarge its cards, never
 * shrinks one below two thirds of its size, where sampling it without mipmaps
 * would start to skip texels. A less dense atlas also costs less memory: 2x
 * stays sharp on a high density display, and 0.5x takes a sixteenth of it.
 *
 * Mirrors `ART_SCALES` in `tools/card-atlas/raster.mjs`.
 */
export const CARD_ART_SCALES = [0.5, 0.75, 1, 1.5, 2] as const;

/** One of the densities in {@link CARD_ART_SCALES}. */
export type CardArtScale = (typeof CARD_ART_SCALES)[number];

/**
 * Returns the least dense atlas that draws cards at a layout scale without
 * enlarging them, or the densest where every atlas would.
 */
export function cardArtScaleFor(layoutScale: number): CardArtScale {
  let chosen: CardArtScale = CARD_ART_SCALES[0];
  for (const artScale of CARD_ART_SCALES) {
    chosen = artScale;
    if (artScale >= layoutScale) break;
  }
  return chosen;
}

/**
 * Returns the size of a card frame at a density, built or drawn at runtime:
 * the card's design size scaled and rounded to whole texels, since 307 units at
 * 0.5x would otherwise be 153.5.
 *
 * Mirrors `frameSize` in `tools/card-atlas/raster.mjs`.
 *
 * @param artScale Texels per design unit.
 */
export function cardFrameTexels(artScale: number): Size {
  return {
    width: Math.round(CARD_RENDER_WIDTH_PX * artScale),
    height: Math.round(CARD_RENDER_HEIGHT_PX * artScale),
  };
}

/**
 * Returns the scale on each axis that draws a frame of an atlas at a layout
 * scale, so a card is drawn at exactly its design size times the layout scale
 * whatever its frame was rounded to.
 *
 * A frame drawn for the very layout scale it is shown at is drawn texel for
 * texel instead, a fraction of a pixel off its design size, since stretching
 * it to fit would blur every texel across two pixels.
 *
 * @param artScale Texels per design unit of the frame.
 */
export function cardSpriteScale(
  layoutScale: number,
  artScale: number,
): { readonly x: number; readonly y: number } {
  if (layoutScale === artScale) return { x: 1, y: 1 };
  const texels = cardFrameTexels(artScale);
  return {
    x: layoutScale * (CARD_RENDER_WIDTH_PX / texels.width),
    y: layoutScale * (CARD_RENDER_HEIGHT_PX / texels.height),
  };
}
