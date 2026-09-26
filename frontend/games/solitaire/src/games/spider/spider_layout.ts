import { boardLayout } from "../common/board_layout";
import { TABLEAU_COUNT, spiderZoneSpecs } from "./spider_zones";

/**
 * The Spider board: ten columns wide, with the stock alone at the left of the
 * top row and the eight foundations filling the right of it.
 */
export const SPIDER_LAYOUT = boardLayout({
  columns: TABLEAU_COUNT,
  rows: 2,
  zones: spiderZoneSpecs(),
  // An opening six plus five dealt rows reaches about 1310 from the top of the
  // board.
  designHeightPx: 1350,
});
