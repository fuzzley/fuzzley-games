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
 * Atlas texels per design unit in the card artwork, which is authored larger
 * than it is drawn so it stays sharp on a high density display.
 *
 * Mirrors `ART_SCALE` in `tools/build-card-atlas.mjs`; change both and run
 * `yarn build:atlas`.
 */
export const CARD_ART_SCALE = 2;

/** The horizontal padding/margin at the edges of the board layout. */
export const LAYOUT_PADDING_X = 40;
/** The vertical padding/margin at the edges of the board layout. */
export const LAYOUT_PADDING_Y = 40;
/** The horizontal space between adjacent columns of piles. */
export const LAYOUT_GAP_X = 30;
/** The vertical space between adjacent rows of piles. */
export const LAYOUT_GAP_Y = 40;

/**
 * The height of the header bar overlaying the board, in CSS pixels.
 *
 * Mirrors `--header-height` in `src/ui/app/styles/_tokens.scss`, which the
 * canvas cannot read.
 */
export const HEADER_HEIGHT_PX = 73;

/**
 * The height of the header on a screen no wider than
 * `COMPACT_MAX_WIDTH_CSS_PX`, in CSS pixels.
 *
 * Mirrors the compact `--header-height` in `src/ui/app/styles/_tokens.scss`.
 */
export const HEADER_HEIGHT_COMPACT_PX = 60;

/**
 * How far a card may still be from its slot while a highlight border stays on
 * it, in design units.
 *
 * About one hover expansion, so the border follows a card nudged by a
 * neighbour's hover but waits for one crossing the board to land.
 */
export const HIGHLIGHT_ANCHOR_SETTLE_TOLERANCE = 15;
