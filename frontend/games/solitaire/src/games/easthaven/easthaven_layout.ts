import { boardLayout } from "../common/board_layout";
import { TABLEAU_COUNT, easthavenZoneSpecs } from "./easthaven_zones";

/**
 * The Easthaven board: seven columns, with the stock alone at the left of the
 * top row and the four foundations at the right of it.
 *
 * At seven columns height binds the scale, so every design unit reserved below
 * the grid costs card size.
 */
export const EASTHAVEN_LAYOUT = boardLayout({
  columns: TABLEAU_COUNT,
  rows: 2,
  zones: easthavenZoneSpecs(),
  // Two buried cards under nine showing reach about 1000 from the top of the
  // board.
  designHeightPx: 1100,
});
