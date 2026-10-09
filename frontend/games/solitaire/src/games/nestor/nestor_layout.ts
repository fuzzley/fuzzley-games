import { boardLayout } from "../common/board_layout";
import {
  arrangedLayouts,
  pileIdsInRow,
  pilesInRow,
} from "../common/arranged_layouts";
import {
  DISCARD_PILE_ID,
  RESERVE_COUNT,
  TABLEAU_COUNT,
  nestorZoneSpecs,
  reservePileId,
} from "./nestor_zones";

/** The zones the grids are read from. */
const ZONES = nestorZoneSpecs();

/**
 * The Nestor board: the reserve at the left of the top row and the discard at
 * its right, with eight columns beneath.
 */
export const NESTOR_LAYOUT = boardLayout({
  columns: TABLEAU_COUNT,
  rows: 2,
  zones: ZONES,
  // The columns only shrink, so the six dealt cards are the deepest one gets:
  // about 987 from the top of the board, with a hovered card open.
  designHeightPx: 987,
});

/**
 * The Nestor board in every arrangement. The reserve and the discard go above
 * the columns or along the bottom, the reserve at whichever side the player
 * asks for. On a phone on its side, the reserve cards stack down one rail,
 * each showing its index but the last, which shows whole above the discard.
 *
 * The discard starts empty, and an empty pile's outline is drawn beneath every
 * card, so it cannot tuck under the last reserve card. The rail is then taller
 * than the columns, which costs no card size: the board is held to a sideways
 * phone's width.
 */
export const NESTOR_ARRANGED_LAYOUTS = arrangedLayouts({
  roomy: NESTOR_LAYOUT,
  columns: pileIdsInRow(ZONES, 1),
  row: pilesInRow(ZONES, 0),
  side: reservePileId(0),
  rails: {
    left: [],
    right: [
      ...Array.from({ length: RESERVE_COUNT }, (_, index) => ({
        pileId: reservePileId(index),
        overlapped: index < RESERVE_COUNT - 1,
      })),
      { pileId: DISCARD_PILE_ID },
    ],
  },
  // The six dealt cards, the most a column ever holds. The grid with the piles
  // below needs no more height than the grid above has.
  longestColumn: { faceDown: 0, faceUp: 6 },
});
