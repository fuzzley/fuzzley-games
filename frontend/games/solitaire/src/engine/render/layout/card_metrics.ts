/** The width of a card cell in the layout grid, used for pile spacing. */
export const CARD_WIDTH_PX = 221;
/** The height of a card cell in the layout grid, used for pile spacing. */
export const CARD_HEIGHT_PX = 313;

/**
 * The width a card or placeholder is drawn at, in design units, a little
 * narrower than its {@link CARD_WIDTH_PX} cell.
 */
export const CARD_RENDER_WIDTH_PX = 220;
/**
 * The height a card or placeholder is drawn at, in design units, a little
 * shorter than its {@link CARD_HEIGHT_PX} cell.
 */
export const CARD_RENDER_HEIGHT_PX = 307;

/**
 * The densities the card atlas is built at, in texels per design unit, from
 * least to most dense: 2 stays sharp on a high density display, and 1 costs a
 * quarter of the memory where cards are drawn no larger than that.
 *
 * Mirrors `ART_SCALES` in `tools/build-card-atlas.mjs`.
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

/** The horizontal padding/margin at the edges of the board layout. */
export const LAYOUT_PADDING_X = 40;
/** The vertical padding/margin at the edges of the board layout. */
export const LAYOUT_PADDING_Y = 40;
/** The horizontal space between adjacent columns of piles. */
export const LAYOUT_GAP_X = 30;
/** The vertical space between adjacent rows of piles. */
export const LAYOUT_GAP_Y = 40;

/**
 * How far a card may still be from its slot while a highlight border stays on
 * it, in design units.
 *
 * About one hover expansion, so the border follows a card nudged by a
 * neighbour's hover but waits for one crossing the board to land.
 */
export const HIGHLIGHT_ANCHOR_SETTLE_TOLERANCE = 15;
