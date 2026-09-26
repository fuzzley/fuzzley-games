import { boardLayout } from "../common/board_layout";
import { TABLEAU_COUNT, spideretteZoneSpecs } from "./spiderette_zones";

/**
 * The Spiderette board: seven columns, with the stock alone at the left of the
 * top row and the four foundations at the right of it.
 *
 * At seven columns height binds the scale, so every design unit reserved below
 * the grid costs card size.
 */
export const SPIDERETTE_LAYOUT = boardLayout({
  columns: TABLEAU_COUNT,
  rows: 2,
  zones: spideretteZoneSpecs(),
  // Six buried cards and eight showing reach about 1100 from the top of the
  // board.
  designHeightPx: 1150,
});
