import { boardLayout } from "../common/board_layout";
import { MonteCarloVariant } from "./monte_carlo_rules";
import {
  BOARD_COLUMN_COUNT,
  GRID_SIZE,
  monteCarloZoneSpecs,
} from "./monte_carlo_zones";

/**
 * The board Monte Carlo and Thirteens share: the stock at the left of the
 * five-by-five grid and the discard at its right.
 *
 * Either variant would do for reading the zones: it changes the rules, not
 * the grid. Nothing fans, so the board needs no `designHeightPx`.
 */
export const MONTE_CARLO_LAYOUT = boardLayout({
  columns: BOARD_COLUMN_COUNT,
  rows: GRID_SIZE,
  zones: monteCarloZoneSpecs(MonteCarloVariant.MONTE_CARLO),
});
