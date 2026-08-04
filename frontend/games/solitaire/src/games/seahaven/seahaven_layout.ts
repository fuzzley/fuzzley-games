import { boardLayout } from "../common/board_layout";
import { TABLEAU_COUNT, seahavenZoneSpecs } from "./seahaven_zones";

/**
 * The Seahaven Towers board: ten columns wide, with the four cells at the left
 * of the top row and the four foundations at the right of it.
 *
 * Ten columns is the same width as Spider and Simple Simon, and the top row has
 * two clear slots in the middle rather than the crowding Eight Off has to live
 * with — eight cells and four foundations force that board to twelve wide even
 * though only eight columns hang beneath it. Four cells is what buys the room
 * here.
 *
 * Width binds the scale at this width on any ordinary viewport, so the reserved
 * height below is free in the sense Eight Off's layout sets out at length.
 */
export const SEAHAVEN_LAYOUT = boardLayout({
  columns: TABLEAU_COUNT,
  rows: 2,
  zones: seahavenZoneSpecs(),
  // Columns run deep: a strict same-suit build with only four cells means a lot
  // of cards land back on the tableau before they leave it. Fourteen deep at a
  // 45-unit gap reaches about 1364 from the top of the board, and reserving
  // beyond about 1415 would start costing card size at 16:9.
  designHeightPx: 1400,
});
