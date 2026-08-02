/** The width of a card cell in the layout grid, used for pile spacing. */
export const CARD_WIDTH_PX = 221;
/** The height of a card cell in the layout grid, used for pile spacing. */
export const CARD_HEIGHT_PX = 313;

/**
 * The width a card (and placeholder) is drawn at, in design units. The rendered
 * card is this size times the layout scale, marginally smaller than the
 * {@link CARD_WIDTH_PX} grid cell.
 */
export const CARD_RENDER_WIDTH_PX = 220;
/**
 * The height a card (and placeholder) is drawn at, in design units. The hover
 * highlight sizes itself from this (not {@link CARD_HEIGHT_PX}) so its border
 * hugs the rendered card instead of leaving a gap below it.
 */
export const CARD_RENDER_HEIGHT_PX = 307;

/**
 * Atlas texels per design unit in the card artwork.
 *
 * The frames are authored larger than the size a card is drawn at so there are
 * enough texels to stay sharp on a high density display, where the layout scale
 * runs up to the device pixel ratio. A sprite is therefore scaled by the layout
 * scale divided by this.
 *
 * Changing it requires rebuilding the atlas: `yarn build:atlas` reads the same
 * value from tools/build-card-atlas.mjs.
 */
export const CARD_ART_SCALE = 2;

/** The horizontal padding/margin at the edges of the board layout. */
export const LAYOUT_PADDING_X = 40;
/** The vertical padding/margin at the edges of the board layout. */
export const LAYOUT_PADDING_Y = 40;
/** The horizontal space between adjacent columns/piles. */
export const LAYOUT_GAP_X = 30; // space between adjacent columns
/** The vertical space between the top row (Stock, Waste, Foundations) and the bottom row (Tableaus). */
export const LAYOUT_GAP_Y = 40; // space between the top row and the bottom (tableau) row

/**
 * The height of the top UI header bar overlay.
 *
 * Mirrors `--header-height` in `src/ui/app/styles/_tokens.scss`, which is the
 * value the header actually draws itself at. The board cannot read that token —
 * it lays itself out in the canvas, not in the DOM — so the number is stated
 * twice and the two have to be changed together.
 */
export const HEADER_HEIGHT_PX = 73;

/**
 * The height of the header once the chrome compacts, in CSS pixels.
 *
 * The shell shrinks the header on a narrow screen, at the same width
 * `COMPACT_MAX_WIDTH_CSS_PX` names in `table_layout.ts` — so a board that went
 * on reserving the full {@link HEADER_HEIGHT_PX} there was holding back
 * thirteen pixels of a phone screen for a header that had already given them
 * up.
 */
export const HEADER_HEIGHT_COMPACT_PX = 60;

/**
 * How far a card may still be from its slot while a highlight border stays on
 * it, in design units.
 *
 * Sized to a hover expansion: moving the pointer down a fanned column retracts
 * one card's expansion as it opens the next, so the card that just gained the
 * border starts up to a nudge away from where it comes to rest. Holding the
 * border back until it is pixel-perfect blanks it for the whole ease, most of
 * which is spent inside the last couple of pixels. A card crossing the board
 * between piles travels far further than a nudge, so it is still held back
 * until it lands.
 */
export const HIGHLIGHT_ANCHOR_SETTLE_TOLERANCE = 15;
