import { boardLayout } from "../common/board_layout";
import {
  BOARD_COLUMN_COUNT,
  DIAL_ROWS,
  grandfathersClockZoneSpecs,
} from "./grandfathers_clock_zones";

/**
 * The Grandfather's Clock board: the dial at the left, and eight columns
 * beside it.
 */
export const GRANDFATHERS_CLOCK_LAYOUT = boardLayout({
  columns: BOARD_COLUMN_COUNT,
  rows: DIAL_ROWS,
  zones: grandfathersClockZoneSpecs(),
  // The dial is the tallest thing on the board, ending about 1466 from its
  // top; a column has room for twenty cards in that height.
  designHeightPx: 1470,
});
