import { boardLayout } from "../common/board_layout";
import { BOARD_COLUMN_COUNT, penguinZoneSpecs } from "./penguin_zones";

/**
 * The Penguin board: the seven cells and four foundations along the top, and
 * seven columns centred beneath.
 */
export const PENGUIN_LAYOUT = boardLayout({
  columns: BOARD_COLUMN_COUNT,
  rows: 2,
  zones: penguinZoneSpecs(),
  // A thirteen-card column, a whole suit, ends about 1302 from the top of the
  // board with a hovered card open.
  designHeightPx: 1327,
});
