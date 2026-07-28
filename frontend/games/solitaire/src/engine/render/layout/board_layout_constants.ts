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

/** The design reference width the board layout was authored at. */
export const DESIGN_WIDTH_PX = 1807;
/** The design reference height the board layout was authored at. */
export const DESIGN_HEIGHT_PX = 950;

/** The horizontal padding/margin at the edges of the board layout. */
export const LAYOUT_PADDING_X = 40;
/** The vertical padding/margin at the edges of the board layout. */
export const LAYOUT_PADDING_Y = 40;
/** The horizontal space between adjacent columns/piles. */
export const LAYOUT_GAP_X = 30; // space between adjacent columns
/** The vertical space between the top row (Stock, Waste, Foundations) and the bottom row (Tableaus). */
export const LAYOUT_GAP_Y = 40; // space between the top row and the bottom (tableau) row

/** The height of the top UI header bar overlay. */
export const HEADER_HEIGHT_PX = 73;
