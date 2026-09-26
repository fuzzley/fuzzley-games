import { boardLayout } from "../common/board_layout";
import {
  BOARD_COLUMN_COUNT,
  doubleKlondikeZoneSpecs,
} from "./double_klondike_zones";

/**
 * The Double Klondike board: eleven columns wide, with the stock and waste at
 * the left of the top row, a clear column for the waste fan, and the eight
 * foundations filling the rest.
 */
export const DOUBLE_KLONDIKE_LAYOUT = boardLayout({
  columns: BOARD_COLUMN_COUNT,
  rows: 2,
  zones: doubleKlondikeZoneSpecs(),
  // A long column reaches about 1050 from the top of the board; this leaves
  // room past that.
  designHeightPx: 1250,
});
