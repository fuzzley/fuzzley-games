import { boardLayout } from "../common/board_layout";
import {
  BOARD_COLUMN_COUNT,
  BOARD_ROW_COUNT,
  triPeaksZoneSpecs,
} from "./tri_peaks_zones";

/**
 * The TriPeaks board: three peaks over a base of ten, each row half a row
 * below the last, with the stock and waste centred beneath.
 *
 * Nothing fans, so the board needs no `designHeightPx`.
 */
export const TRI_PEAKS_LAYOUT = boardLayout({
  columns: BOARD_COLUMN_COUNT,
  rows: BOARD_ROW_COUNT,
  zones: triPeaksZoneSpecs(),
});
