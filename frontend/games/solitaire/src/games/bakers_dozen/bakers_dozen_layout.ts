import { boardLayout } from "../common/board_layout";
import { TABLEAU_COUNT, bakersDozenZoneSpecs } from "./bakers_dozen_zones";

/**
 * The Baker's Dozen board: thirteen columns wide, with the four foundations at
 * the right of an otherwise empty top row.
 */
export const BAKERS_DOZEN_LAYOUT = boardLayout({
  columns: TABLEAU_COUNT,
  rows: 2,
  zones: bakersDozenZoneSpecs(),
  // A twelve-card column, deeper than a real game reaches, ends about 1275
  // from the top of the board.
  designHeightPx: 1300,
});
