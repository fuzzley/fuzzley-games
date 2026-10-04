import { boardLayout } from "../common/board_layout";
import {
  BOARD_COLUMN_COUNT,
  flowerGardenZoneSpecs,
} from "./flower_garden_zones";

/**
 * The Flower Garden board: the bouquet fanned across the top left, the
 * foundations at the top right, and six beds centred beneath.
 */
export const FLOWER_GARDEN_LAYOUT = boardLayout({
  columns: BOARD_COLUMN_COUNT,
  rows: 2,
  zones: flowerGardenZoneSpecs(),
  // Beds take the whole bouquet between them, so one can grow well past its
  // six cards; a fifteen-card bed ends about 1377 from the top of the board.
  designHeightPx: 1377,
});
