import { boardLayout } from "../common/board_layout";
import { BOARD_COLUMN_COUNT, eightOffZoneSpecs } from "./eight_off_zones";

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
  zones: eightOffZoneSpecs(),
  // Room for a column much deeper than the six it is dealt, which costs no card
  // size here.
  designHeightPx: 1200,
});
