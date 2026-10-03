import { boardLayout } from "../common/board_layout";
import { TABLEAU_COUNT, nestorZoneSpecs } from "./nestor_zones";

/**
 * The Nestor board: the reserve at the left of the top row and the discard at
 * its right, with eight columns beneath.
 */
export const NESTOR_LAYOUT = boardLayout({
  columns: TABLEAU_COUNT,
  rows: 2,
  zones: nestorZoneSpecs(),
  // The columns only shrink, so the six dealt cards are the deepest one gets:
  // about 1060 from the top of the board, with a hovered card open.
  designHeightPx: 1060,
});
