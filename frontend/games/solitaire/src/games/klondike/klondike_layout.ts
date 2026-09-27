import { boardLayout } from "../common/board_layout";
import { TABLEAU_COUNT, klondikeZoneSpecs } from "./klondike_zones";
import { DEFAULT_DRAW_COUNT } from "./klondike_rules";

/**
 * The Klondike board: stock and waste at the left of the top row, foundations
 * at the right of it, and the tableau columns filling the bottom row.
 *
 * Any draw mode would do for reading the zones: it changes the waste fan, not
 * the grid.
 */
export const KLONDIKE_LAYOUT = boardLayout({
  columns: TABLEAU_COUNT,
  rows: 2,
  zones: klondikeZoneSpecs(DEFAULT_DRAW_COUNT),
  // The grid alone needs 819; the rest is room for a column to fan into.
  designHeightPx: 950,
});
