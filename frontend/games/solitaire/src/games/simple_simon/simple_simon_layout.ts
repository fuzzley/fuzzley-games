import { boardLayout } from "../common/board_layout";
import {
  SimpleSimonVariant,
  simpleSimonTableauCount,
} from "./simple_simon_rules";
import { simpleSimonZoneSpecs } from "./simple_simon_zones";

/**
 * The Simple Simon board: ten columns wide, with the four foundations at the
 * right of an otherwise empty top row.
 */
export const SIMPLE_SIMON_LAYOUT = boardLayout({
  columns: simpleSimonTableauCount(SimpleSimonVariant.SIMPLE_SIMON),
  rows: 2,
  zones: simpleSimonZoneSpecs(SimpleSimonVariant.SIMPLE_SIMON),
  // A fifteen-card column reaches about 1500 from the top of the board, and at
  // ten columns wide the height costs no card size.
  designHeightPx: 1500,
});

/**
 * The Mrs. Mop board: thirteen columns wide, with the eight foundations at the
 * right of the top row.
 */
export const MRS_MOP_LAYOUT = boardLayout({
  columns: simpleSimonTableauCount(SimpleSimonVariant.MRS_MOP),
  rows: 2,
  zones: simpleSimonZoneSpecs(SimpleSimonVariant.MRS_MOP),
  // A twenty-three-card column reaches about 1770 from the top of the board,
  // and at thirteen columns wide the height costs no card size.
  designHeightPx: 1800,
});
