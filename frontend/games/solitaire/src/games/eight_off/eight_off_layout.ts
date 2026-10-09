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
  FOUNDATION_COUNT,
  TABLEAU_COUNT,
  eightOffZoneSpecs,
} from "./eight_off_zones";

/** The zones the grids are read from. */
const ZONES = eightOffZoneSpecs();

/** The cells, left to right. */
const CELLS = Array.from({ length: CELL_COUNT }, (_, index) =>
  cellPileId(index),
);

/** The foundations, left to right. */
const FOUNDATIONS = Array.from({ length: FOUNDATION_COUNT }, (_, index) =>
  foundationPileId(index),
);

/**
 * The Eight Off board: twelve columns wide, with the eight cells and the four
 * foundations filling the top row and the eight tableau columns centred in the
 * bottom one.
 *
 * One wide top row rather than two narrower ones, so width binds the scale and
 * a deep column costs no card size.
 */
export const EIGHT_OFF_LAYOUT = boardLayout({
  columns: BOARD_COLUMN_COUNT,
  rows: 2,
  zones: ZONES,
  // Room for a column much deeper than the six it is dealt, which costs no card
  // size here.
  designHeightPx: 1127,
});

/**
 * The Eight Off board in every arrangement. The cells go with the foundations
 * above the columns or along the bottom, the cells at whichever side the
 * player asks for. An upright phone, as wide as the columns, takes them in two
 * lines: the foundations centred next to the columns, and the eight cells
 * beyond them on the edge. On a phone on its side, the cells stack down one
 * rail and the foundations the other.
 */
export const EIGHT_OFF_ARRANGED_LAYOUTS = arrangedLayouts({
  roomy: EIGHT_OFF_LAYOUT,
  columns: pileIdsInRow(ZONES, 1),
  row: pilesInRow(ZONES, 0),
  uprightLines: [
    FOUNDATIONS.map((pileId, index) => ({
      pileId,
      column: (TABLEAU_COUNT - FOUNDATION_COUNT) / 2 + index,
    })),
    CELLS.map((pileId, column) => ({ pileId, column })),
  ],
  side: cellPileId(0),
  rails: {
    left: CELLS.map((pileId) => ({ pileId, overlapped: true })),
    right: FOUNDATIONS.map((pileId) => ({ pileId, overlapped: true })),
  },
  // Fourteen cards: six dealt, and a run built on them. The grid with the
  // piles below grows to 1229 for it, which costs no card size at twelve
  // columns wide.
  longestColumn: { faceDown: 0, faceUp: 14 },
});
