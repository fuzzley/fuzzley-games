import { boardLayout } from "../common/board_layout";
import {
  arrangedLayouts,
  pileIdsInRow,
  pilesInRow,
} from "../common/arranged_layouts";
import { cellPileId, foundationPileId } from "../common/pile_ids";
import {
  BOARD_COLUMN_COUNT,
  CELL_COUNT,
  TABLEAU_COUNT,
  penguinZoneSpecs,
} from "./penguin_zones";

/** The zones the grids are read from. */
const ZONES = penguinZoneSpecs();

/** The cells of the flipper, left to right. */
const CELLS = Array.from({ length: CELL_COUNT }, (_, index) =>
  cellPileId(index),
);

/** The foundations, left to right. */
const FOUNDATIONS = Array.from({ length: 4 }, (_, index) =>
  foundationPileId(index),
);

/**
 * The Penguin board: the seven cells and four foundations along the top, and
 * seven columns centred beneath.
 */
export const PENGUIN_LAYOUT = boardLayout({
  columns: BOARD_COLUMN_COUNT,
  rows: 2,
  zones: ZONES,
  // A thirteen-card column, a whole suit, ends about 1302 from the top of the
  // board with a hovered card open.
  designHeightPx: 1327,
});

/**
 * The Penguin board in every arrangement, as Eight Off's: the flipper's cells
 * go with the foundations above the columns or along the bottom, the cells at
 * whichever side the player asks for. An upright phone, as wide as the
 * columns, takes them in two lines: the foundations centred next to the
 * columns, and the seven cells beyond them on the edge. On a phone on its
 * side, the cells stack down one rail and the foundations the other.
 */
export const PENGUIN_ARRANGED_LAYOUTS = arrangedLayouts({
  roomy: PENGUIN_LAYOUT,
  columns: pileIdsInRow(ZONES, 1),
  row: pilesInRow(ZONES, 0),
  uprightLines: [
    FOUNDATIONS.map((pileId, index) => ({
      pileId,
      column: (TABLEAU_COUNT - FOUNDATIONS.length) / 2 + index,
    })),
    CELLS.map((pileId, column) => ({ pileId, column })),
  ],
  side: cellPileId(0),
  rails: {
    left: CELLS.map((pileId) => ({ pileId, overlapped: true })),
    right: FOUNDATIONS.map((pileId) => ({ pileId, overlapped: true })),
  },
  // Thirteen cards, a whole suit. The grid with the piles below needs no more
  // height than the grid above has.
  longestColumn: { faceDown: 0, faceUp: 13 },
});
