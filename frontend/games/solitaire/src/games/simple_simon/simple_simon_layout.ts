import { boardLayout } from "../common/board_layout";
import {
  arrangedLayouts,
  pileIdsInRow,
  pilesInRow,
} from "../common/arranged_layouts";
import {
  SimpleSimonVariant,
  simpleSimonTableauCount,
} from "./simple_simon_rules";
import { simpleSimonZoneSpecs } from "./simple_simon_zones";

/** The zones Simple Simon's grids are read from. */
const SIMPLE_SIMON_ZONES = simpleSimonZoneSpecs(
  SimpleSimonVariant.SIMPLE_SIMON,
);

/**
 * The Simple Simon board: ten columns wide, with the four foundations at the
 * right of an otherwise empty top row.
 */
export const SIMPLE_SIMON_LAYOUT = boardLayout({
  columns: simpleSimonTableauCount(SimpleSimonVariant.SIMPLE_SIMON),
  rows: 2,
  zones: SIMPLE_SIMON_ZONES,
  // A fifteen-card column reaches about 1427 from the top of the board, and at
  // ten columns wide the height costs no card size.
  designHeightPx: 1427,
});

/**
 * The Simple Simon board in every arrangement. The foundations go above the
 * columns or along the bottom, always at the right, since a row of foundations
 * alone has no side worth choosing. On a phone on its side, they stack down
 * one rail.
 */
export const SIMPLE_SIMON_ARRANGED_LAYOUTS = arrangedLayouts({
  roomy: SIMPLE_SIMON_LAYOUT,
  columns: pileIdsInRow(SIMPLE_SIMON_ZONES, 1),
  row: pilesInRow(SIMPLE_SIMON_ZONES, 0),
  rails: {
    left: [],
    right: pileIdsInRow(SIMPLE_SIMON_ZONES, 0).map((pileId) => ({
      pileId,
      overlapped: true,
    })),
  },
  // Fifteen cards: the eight dealt to the first columns, and a run built on
  // them. The grid with the piles below needs no more height than the grid
  // above has.
  longestColumn: { faceDown: 0, faceUp: 15 },
});

/** The zones Mrs. Mop's grids are read from. */
const MRS_MOP_ZONES = simpleSimonZoneSpecs(SimpleSimonVariant.MRS_MOP);

/**
 * The Mrs. Mop board: thirteen columns wide, with the eight foundations at the
 * right of the top row.
 */
export const MRS_MOP_LAYOUT = boardLayout({
  columns: simpleSimonTableauCount(SimpleSimonVariant.MRS_MOP),
  rows: 2,
  zones: MRS_MOP_ZONES,
  // A twenty-three-card column reaches about 1697 from the top of the board,
  // and at thirteen columns wide the height costs no card size.
  designHeightPx: 1727,
});

/**
 * The Mrs. Mop board in every arrangement, as Simple Simon's. At thirteen
 * columns every phone grid is held to the screen's width, so making room for
 * the longest column costs no card size.
 */
export const MRS_MOP_ARRANGED_LAYOUTS = arrangedLayouts({
  roomy: MRS_MOP_LAYOUT,
  columns: pileIdsInRow(MRS_MOP_ZONES, 1),
  row: pilesInRow(MRS_MOP_ZONES, 0),
  rails: {
    left: [],
    right: pileIdsInRow(MRS_MOP_ZONES, 0).map((pileId) => ({
      pileId,
      overlapped: true,
    })),
  },
  // Twenty-three cards, as the grid above makes room for. The grid with the
  // piles below needs no more height than the grid above has.
  longestColumn: { faceDown: 0, faceUp: 23 },
});
