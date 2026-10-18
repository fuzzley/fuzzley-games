import { boardLayout } from "../common/board_layout";
import {
  arrangedLayouts,
  pileIdsInRow,
  pilesInRow,
} from "../common/arranged_layouts";
import { cellPileId, foundationPileId } from "../common/pile_ids";
import {
  CELL_COUNT,
  FOUNDATION_COUNT,
  TABLEAU_COUNT,
  seahavenZoneSpecs,
} from "./seahaven_zones";

/** The zones the grids are read from. */
const ZONES = seahavenZoneSpecs();

/**
 * The Seahaven Towers board: ten columns wide, with the four cells at the left
 * of the top row and the four foundations at the right of it.
 */
export const SEAHAVEN_LAYOUT = boardLayout({
  columns: TABLEAU_COUNT,
  rows: 2,
  zones: ZONES,
  // A fourteen-card column reaches about 1291 from the top of the board, and
  // reserving beyond about 1342 would start costing card size at 16:9.
  designHeightPx: 1327,
});

/**
 * The Seahaven Towers board in every arrangement. The cells go with the
 * foundations above the columns or along the bottom, the cells at whichever
 * side the player asks for. On a phone on its side, the cells stack down one
 * rail and the foundations the other.
 */
export const SEAHAVEN_ARRANGED_LAYOUTS = arrangedLayouts({
  roomy: SEAHAVEN_LAYOUT,
  columns: pileIdsInRow(ZONES, 1),
  row: pilesInRow(ZONES, 0),
  side: cellPileId(0),
  rails: {
    left: Array.from({ length: CELL_COUNT }, (_, index) => ({
      pileId: cellPileId(index),
      overlapped: true,
    })),
    right: Array.from({ length: FOUNDATION_COUNT }, (_, index) => ({
      pileId: foundationPileId(index),
      overlapped: true,
    })),
  },
  // Fourteen cards: five dealt, and a run built on them. The grid with the
  // piles below needs no more height than the grid above has.
  longestColumn: { faceDown: 0, faceUp: 14 },
});
