import { boardLayout } from "../common/board_layout";
import { BOARD_COLUMN_COUNT, montanaZoneSpecs } from "./montana_zones";
import { ROW_COUNT } from "./montana_rules";

/**
 * The Montana board: a grid of four rows by thirteen, with the redeal marker in
 * a fourteenth column beside it.
 *
 * Nothing fans, so the board needs no `designHeightPx`.
 */
export const MONTANA_LAYOUT = boardLayout({
  columns: BOARD_COLUMN_COUNT,
  rows: ROW_COUNT,
  zones: montanaZoneSpecs(),
});
