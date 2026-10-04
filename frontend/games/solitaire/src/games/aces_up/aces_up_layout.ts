import { boardLayout } from "../common/board_layout";
import { AcesUpSpaces } from "./aces_up_rules";
import { BOARD_COLUMN_COUNT, acesUpZoneSpecs } from "./aces_up_zones";

/**
 * The Aces Up board: one row of stock, four columns and the discard.
 *
 * Either empty-column rule would do for reading the zones: it changes the
 * rules, not the grid.
 */
export const ACES_UP_LAYOUT = boardLayout({
  columns: BOARD_COLUMN_COUNT,
  rows: 1,
  zones: acesUpZoneSpecs(AcesUpSpaces.ANY_CARD),
  // A column dealt all thirteen of its cards with nothing discarded ends about
  // 933 from the top of the board.
  designHeightPx: 977,
});
