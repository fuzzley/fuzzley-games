import { boardLayout } from "../common/board_layout";
import {
  BOARD_COLUMN_COUNT,
  BOARD_ROW_COUNT,
  pyramidZoneSpecs,
} from "./pyramid_zones";

/**
 * The Pyramid board: the pyramid's seven rows, each half a row below the
 * last, with the stock and hand in the top-left corner beside its peak and the
 * waste and discard in the top-right.
 *
 * Either number of passes would do for reading the zones: it changes the
 * rules, not the grid. Nothing fans, so the board needs no `designHeightPx`.
 */
export const PYRAMID_LAYOUT = boardLayout({
  columns: BOARD_COLUMN_COUNT,
  rows: BOARD_ROW_COUNT,
  zones: pyramidZoneSpecs(1),
});
