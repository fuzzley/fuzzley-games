/**
 * The densities the card atlas is built at, in texels per design unit, from
 * least to most dense: 2 stays sharp on a high density display, and 1 costs a
 * quarter of the memory where cards are drawn no larger than that.
 *
 * Mirrors `ART_SCALES` in `tools/card-atlas/raster.mjs`.
 */
export const CARD_ART_SCALES = [1, 2] as const;

/** One of the densities in {@link CARD_ART_SCALES}. */
export type CardArtScale = (typeof CARD_ART_SCALES)[number];

/**
 * Returns the least dense atlas that draws cards at a layout scale without
 * enlarging them.
 */
export function cardArtScaleFor(layoutScale: number): CardArtScale {
  return layoutScale <= 1 ? 1 : 2;
}
