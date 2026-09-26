import { boardLayout } from "../common/board_layout";
import { TABLEAU_COUNT, simpleSimonZoneSpecs } from "./simple_simon_zones";

/**
 * The Simple Simon board: ten columns wide, with the four foundations at the
 * right of an otherwise empty top row.
 */
export const SIMPLE_SIMON_LAYOUT = boardLayout({
  columns: TABLEAU_COUNT,
  rows: 2,
  zones: simpleSimonZoneSpecs(),
  // A fifteen-card column reaches about 1500 from the top of the board, and at
  // ten columns wide the height costs no card size.
  designHeightPx: 1500,
});
