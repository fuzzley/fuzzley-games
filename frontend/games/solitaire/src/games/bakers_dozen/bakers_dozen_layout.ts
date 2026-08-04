import { boardLayout } from "../common/board_layout";
import { TABLEAU_COUNT, bakersDozenZoneSpecs } from "./bakers_dozen_zones";

/**
 * The Baker's Dozen board: thirteen columns wide, with the four foundations at
 * the right of an otherwise empty top row.
 *
 * The widest board in the application by three columns, and nothing had to be
 * told about it: the design width falls out of the grid, so a game with more
 * columns simply gets a wider board and a smaller card.
 *
 * Width binds the scale here by a wide margin — thirteen columns need about
 * 3300 design units across against a grid only 819 tall — which means the
 * reserved height below is free, in the sense Eight Off's layout sets out. It
 * could be raised considerably before it started costing card size.
 */
export const BAKERS_DOZEN_LAYOUT = boardLayout({
  columns: TABLEAU_COUNT,
  rows: 2,
  zones: bakersDozenZoneSpecs(),
  // Columns start at four and grow slowly: cards leave for the foundations one
  // at a time and never come back, and no column can be started over. Twelve
  // deep at a 45-unit gap is beyond what a real game reaches, and reaches about
  // 1275 from the top of the board.
  designHeightPx: 1300,
});
