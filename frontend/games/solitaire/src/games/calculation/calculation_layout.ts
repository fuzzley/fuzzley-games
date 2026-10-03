import { boardLayout } from "../common/board_layout";
import { CalculationVariant } from "./calculation_rules";
import { BOARD_COLUMN_COUNT, calculationZoneSpecs } from "./calculation_zones";

/**
 * The board Calculation and Sir Tommy share: stock, hand and four foundations
 * along the top, and a waste pile under each foundation.
 *
 * Either variant would do for reading the zones: it changes the rules, not
 * the grid.
 */
export const CALCULATION_LAYOUT = boardLayout({
  columns: BOARD_COLUMN_COUNT,
  rows: 2,
  zones: calculationZoneSpecs(CalculationVariant.CALCULATION),
  // A thirteen-card waste pile, as deep as a careful game lets one grow, ends
  // about 1400 from the top of the board.
  designHeightPx: 1400,
});
