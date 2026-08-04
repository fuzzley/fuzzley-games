import { boardLayout } from "../common/board_layout";
import {
  BOARD_COLUMN_COUNT,
  doubleKlondikeZoneSpecs,
} from "./double_klondike_zones";

/**
 * The Double Klondike board: eleven columns wide, with the stock and waste at
 * the left of the top row, a clear column for the waste fan, and the eight
 * foundations filling the rest.
 *
 * Wider than its own tableau, as Eight Off's and Maria's boards are: eleven
 * slots have to fit across the top whatever hangs beneath, and only nine columns
 * do. The nine are centred under them.
 *
 * At eleven columns width binds the scale comfortably, so the reserved height
 * below is free — the trade Eight Off's layout sets out at length.
 */
export const DOUBLE_KLONDIKE_LAYOUT = boardLayout({
  columns: BOARD_COLUMN_COUNT,
  rows: 2,
  zones: doubleKlondikeZoneSpecs(),
  // Columns run deeper than Klondike's: the ninth is dealt nine cards before a
  // single move is made, and two decks feed a tableau only two columns wider.
  // Eight buried at 18 under ten showing at 45 reaches about 1050 from the top
  // of the board; this leaves room past that.
  designHeightPx: 1250,
});
