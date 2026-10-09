import { boardLayout } from "../common/board_layout";
import {
  arrangedLayouts,
  pileIdsInRow,
  pilesInRow,
} from "../common/arranged_layouts";
import { CalculationVariant } from "./calculation_rules";
import {
  BOARD_COLUMN_COUNT,
  HAND_PILE_ID,
  STOCK_PILE_ID,
  calculationZoneSpecs,
} from "./calculation_zones";

/**
 * The zones the grids are read from. Either variant would do: it changes the
 * rules, not the grid.
 */
const ZONES = calculationZoneSpecs(CalculationVariant.CALCULATION);

/** The foundations, left to right. */
const FOUNDATIONS = pileIdsInRow(ZONES, 0).filter(
  (pileId) => pileId !== STOCK_PILE_ID && pileId !== HAND_PILE_ID,
);

/**
 * The board Calculation and Sir Tommy share: stock, hand and four foundations
 * along the top, and a waste pile under each foundation.
 */
export const CALCULATION_LAYOUT = boardLayout({
  columns: BOARD_COLUMN_COUNT,
  rows: 2,
  zones: ZONES,
  // A thirteen-card waste pile, as deep as a careful game lets one grow, ends
  // about 1327 from the top of the board.
  designHeightPx: 1327,
});

/**
 * The Calculation board in every arrangement. The stock and hand go with the
 * foundations above the waste piles or along the bottom, at whichever side the
 * player asks for, each waste pile staying under its foundation. On a phone on
 * its side, the foundations stack down one rail, each showing its index, and
 * the stock and the hand the other.
 */
export const CALCULATION_ARRANGED_LAYOUTS = arrangedLayouts({
  roomy: CALCULATION_LAYOUT,
  columns: pileIdsInRow(ZONES, 1),
  row: pilesInRow(ZONES, 0),
  side: STOCK_PILE_ID,
  rails: {
    left: FOUNDATIONS.map((pileId) => ({ pileId, overlapped: true })),
    right: [{ pileId: STOCK_PILE_ID }, { pileId: HAND_PILE_ID }],
  },
  // A thirteen-card waste pile. The grid with the piles below needs no more
  // height than the grid above has.
  longestColumn: { faceDown: 0, faceUp: 13 },
});
