import { boardLayout } from "../common/board_layout";
import { TABLEAU_COUNT, seahavenZoneSpecs } from "./seahaven_zones";

/**
 * The Seahaven Towers board: ten columns wide, with the four cells at the left
 * of the top row and the four foundations at the right of it.
 */
export const SEAHAVEN_LAYOUT = boardLayout({
  columns: TABLEAU_COUNT,
  rows: 2,
  zones: seahavenZoneSpecs(),
  // A fourteen-card column reaches about 1291 from the top of the board, and
  // reserving beyond about 1342 would start costing card size at 16:9.
  designHeightPx: 1327,
});
