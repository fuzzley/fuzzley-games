import { boardLayout } from "../common/board_layout";
import {
  arrangedLayouts,
  pileIdsInRow,
  pilesInRow,
} from "../common/arranged_layouts";
import { GolfVariant } from "./golf_rules";
import {
  FOUNDATION_PILE_ID,
  STOCK_PILE_ID,
  TABLEAU_COUNT,
  golfZoneSpecs,
} from "./golf_zones";

/**
 * The zones the grids are read from. Any variant would do: it changes the
 * rules, not the grid.
 */
const ZONES = golfZoneSpecs(GolfVariant.GOLF);

/**
 * The Golf board: the stock and foundation along the top, and seven columns
 * beneath.
 */
export const GOLF_LAYOUT = boardLayout({
  columns: TABLEAU_COUNT,
  rows: 2,
  zones: ZONES,
  // The columns only shrink, so the five dealt cards are the deepest one gets:
  // about 927 from the top of the board, with a hovered card open.
  designHeightPx: 947,
});

/**
 * The Golf board in every arrangement. The stock and foundation go above the
 * columns or along the bottom, at whichever side the player asks for. On a
 * phone on its side they share one rail, the foundation whole below the
 * stock, which may tuck under it, so the rail is no taller than the columns.
 */
export const GOLF_ARRANGED_LAYOUTS = arrangedLayouts({
  roomy: GOLF_LAYOUT,
  columns: pileIdsInRow(ZONES, 1),
  row: pilesInRow(ZONES, 0),
  side: STOCK_PILE_ID,
  rails: {
    left: [],
    right: [
      { pileId: STOCK_PILE_ID, overlapped: true },
      { pileId: FOUNDATION_PILE_ID },
    ],
  },
  // The five dealt cards, the most a column ever holds. The grid with the
  // piles below needs no more height than the grid above has.
  longestColumn: { faceDown: 0, faceUp: 5 },
});
