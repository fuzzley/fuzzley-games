import { boardLayout } from "../common/board_layout";
import { CanfieldVariant } from "./canfield_rules";
import { BOARD_COLUMN_COUNT, canfieldZoneSpecs } from "./canfield_zones";

/**
 * The board the Canfield family shares: stock, waste and foundations along
 * the top, the reserve under the stock and four columns under the
 * foundations.
 *
 * Any variant would do for reading the zones: they change the rules and how
 * the reserve is drawn, not the grid.
 */
export const CANFIELD_LAYOUT = boardLayout({
  columns: BOARD_COLUMN_COUNT,
  rows: 2,
  zones: canfieldZoneSpecs(CanfieldVariant.CANFIELD),
  // A fourteen-card column, or Superior Canfield's fanned reserve, ends about
  // 1347 from the top of the board, with a hovered card open.
  designHeightPx: 1347,
});
