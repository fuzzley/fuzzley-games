import { boardLayout } from "../common/board_layout";
import { TABLEAU_COUNT, scorpionZoneSpecs } from "./scorpion_zones";

/**
 * The Scorpion board: seven columns, with the stock alone at the left of the
 * top row and the four foundations at the right of it.
 */
export const SCORPION_LAYOUT = boardLayout({
  columns: TABLEAU_COUNT,
  rows: 2,
  zones: scorpionZoneSpecs(),
  // Room for the two or three deep stacks a board collects into before the
  // first run completes.
  designHeightPx: 1150,
});
