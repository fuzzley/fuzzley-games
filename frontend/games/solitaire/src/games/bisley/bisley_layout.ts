import { boardLayout } from "../common/board_layout";
import { TABLEAU_COUNT, bisleyZoneSpecs } from "./bisley_zones";

/**
 * The Bisley board: thirteen columns wide, with the Ace foundations starting
 * the top row and the King foundations ending it.
 */
export const BISLEY_LAYOUT = boardLayout({
  columns: TABLEAU_COUNT,
  rows: 2,
  zones: bisleyZoneSpecs(),
  // Columns build both ways, so one can grow well past its four cards; a
  // twelve-card column ends about 1202 from the top of the board.
  designHeightPx: 1227,
});
