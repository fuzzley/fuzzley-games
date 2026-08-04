import { boardLayout } from "../common/board_layout";
import { TABLEAU_COUNT, simpleSimonZoneSpecs } from "./simple_simon_zones";

/**
 * The Simple Simon board: ten columns wide, with the four foundations at the
 * right of an otherwise empty top row.
 *
 * The same width as Spider and for the same reason, but the columns run deeper
 * here than the opening eight suggests. Nothing ever leaves the tableau except
 * as a finished thirteen-card run, so cards accumulate on the columns for most
 * of the game rather than draining steadily onto foundations the way they do in
 * Klondike. The reserved height is set for that rather than for the deal.
 */
export const SIMPLE_SIMON_LAYOUT = boardLayout({
  columns: TABLEAU_COUNT,
  rows: 2,
  zones: simpleSimonZoneSpecs(),
  // A column of fifteen at a 45-unit gap reaches about 1500 from the top of the
  // board. Ten columns means width binds the scale on any ordinary viewport, so
  // the extra height below the grid is slack and costs the cards nothing — the
  // same trade Eight Off's layout sets out at length.
  designHeightPx: 1500,
});
