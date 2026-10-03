import { boardLayout } from "../common/board_layout";
import {
  BOARD_COLUMN_COUNT,
  GRID_SIZE,
  pokerSquaresZoneSpecs,
} from "./poker_squares_zones";

/**
 * The Poker Squares board: the stock and the card to place at the left, and
 * the five-by-five grid beside them.
 *
 * Nothing fans, so the board needs no `designHeightPx`.
 */
export const POKER_SQUARES_LAYOUT = boardLayout({
  columns: BOARD_COLUMN_COUNT,
  rows: GRID_SIZE,
  zones: pokerSquaresZoneSpecs(),
});
