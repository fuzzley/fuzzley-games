import { boardLayout } from "../common/board_layout";
import { BOARD_COLUMN_COUNT, montanaZoneSpecs } from "./montana_zones";
import { ROW_COUNT } from "./montana_rules";

/**
 * The Montana board: a grid of four rows by thirteen, with the redeal marker in
 * a fourteenth column beside it.
 *
 * The only board here that is a genuine grid rather than a top row over a
 * tableau, and the only one with four rows. Nothing fans, because no cell ever
 * holds more than one card — so unlike every other layout in the project there
 * is no reserved height to argue about. The grid's own four rows are exactly
 * what the board needs, and `designHeightPx` is left unset to say so.
 *
 * Fourteen columns across four rows is the largest grid in the application, and
 * width binds the scale comfortably at it.
 */
export const MONTANA_LAYOUT = boardLayout({
  columns: BOARD_COLUMN_COUNT,
  rows: ROW_COUNT,
  zones: montanaZoneSpecs(),
});
