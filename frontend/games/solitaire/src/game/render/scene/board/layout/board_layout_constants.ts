/** The width of a card cell in the layout grid, used for pile spacing. */
export const CARD_WIDTH_PX = 221;
/** The height of a card cell in the layout grid, used for pile spacing. */
export const CARD_HEIGHT_PX = 313;

/**
 * The actual pixel width of a card (and placeholder) frame in the texture
 * atlas. The rendered card is this size times the layout scale, marginally
 * smaller than the {@link CARD_WIDTH_PX} grid cell.
 */
export const CARD_TEXTURE_WIDTH_PX = 220;
/**
 * The actual pixel height of a card (and placeholder) frame in the texture
 * atlas. The hover highlight sizes itself from this (not {@link CARD_HEIGHT_PX})
 * so its border hugs the rendered card instead of leaving a gap below it.
 */
export const CARD_TEXTURE_HEIGHT_PX = 307;

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
