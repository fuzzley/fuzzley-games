import { boardLayout } from "../common/board_layout";
import { TABLEAU_COUNT, spiderZoneSpecs } from "./spider_zones";

/**
 * The Spider board: ten columns wide, with the stock alone at the left of the
 * top row and the eight foundations filling the right of it.
 *
 * A third board width after Klondike's seven and FreeCell's eight, and again
 * nothing in the engine was told: the design width falls out of the grid.
 */
export const SPIDER_LAYOUT = boardLayout({
  columns: TABLEAU_COUNT,
  rows: 2,
  zones: spiderZoneSpecs(),
  // Columns run deep in Spider: an opening six plus five dealt rows is eleven
  // cards, which at a 45-unit face-up gap reaches about 1310 from the top of
  // the board. Reserving that keeps the longest column on screen.
  designHeightPx: 1350,
});
