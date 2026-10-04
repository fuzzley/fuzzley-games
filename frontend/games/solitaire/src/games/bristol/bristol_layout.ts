import { boardLayout } from "../common/board_layout";
import { TABLEAU_COUNT, bristolZoneSpecs } from "./bristol_zones";

/**
 * The board Bristol and Belvedere share: stock, reserves and foundations along
 * the top, and eight fans beneath.
 */
export const BRISTOL_LAYOUT = boardLayout({
  columns: TABLEAU_COUNT,
  rows: 2,
  zones: bristolZoneSpecs(),
  // A fan can grow from its three cards to a dozen; one that long ends about
  // 1202 from the top of the board.
  designHeightPx: 1227,
});
