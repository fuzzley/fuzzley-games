import { boardLayout } from "../common/board_layout";
import { GolfVariant } from "./golf_rules";
import { TABLEAU_COUNT, golfZoneSpecs } from "./golf_zones";

/**
 * The Golf board: the stock and foundation along the top, and seven columns
 * beneath.
 *
 * Any variant would do for reading the zones: it changes the rules, not the
 * grid.
 */
export const GOLF_LAYOUT = boardLayout({
  columns: TABLEAU_COUNT,
  rows: 2,
  zones: golfZoneSpecs(GolfVariant.GOLF),
  // The columns only shrink, so the five dealt cards are the deepest one gets:
  // about 1000 from the top of the board, with a hovered card open.
  designHeightPx: 1020,
});
