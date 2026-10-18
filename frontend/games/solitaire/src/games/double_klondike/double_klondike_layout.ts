import { CARD_HEIGHT_PX } from "@/engine/render/layout/card_metrics";
import { boardLayout } from "../common/board_layout";
import {
  arrangedLayouts,
  pileIdsInRow,
  pilesInRow,
} from "../common/arranged_layouts";
import {
  WASTE_FAN_OFFSET_X,
  WASTE_MAX_FAN_CARDS,
} from "../common/pile_layouts";
import {
  BOARD_COLUMN_COUNT,
  STOCK_PILE_ID,
  TABLEAU_COUNT,
  WASTE_PILE_ID,
  doubleKlondikeZoneSpecs,
} from "./double_klondike_zones";

/** The zones the grids are read from. */
const ZONES = doubleKlondikeZoneSpecs();

/** The foundations, left to right. */
const FOUNDATIONS = pileIdsInRow(ZONES, 0).filter(
  (pileId) => pileId !== STOCK_PILE_ID && pileId !== WASTE_PILE_ID,
);

/**
 * The Double Klondike board: eleven columns wide, with the stock and waste at
 * the left of the top row, a clear column for the waste fan, and the eight
 * foundations filling the rest.
 */
export const DOUBLE_KLONDIKE_LAYOUT = boardLayout({
  columns: BOARD_COLUMN_COUNT,
  rows: 2,
  zones: ZONES,
  // A long column reaches about 977 from the top of the board; this leaves
  // room past that.
  designHeightPx: 1177,
});

/**
 * The Double Klondike board in every arrangement, as Klondike's: the stock and
 * waste go with the foundations above the columns, which stay centred under
 * them, or along the bottom, at whichever side the player asks for. On a phone
 * on its side, the foundations stack down one rail and the stock tops the
 * other, with the waste spreading down under it.
 */
export const DOUBLE_KLONDIKE_ARRANGED_LAYOUTS = arrangedLayouts({
  roomy: DOUBLE_KLONDIKE_LAYOUT,
  columns: pileIdsInRow(ZONES, 1),
  row: pilesInRow(ZONES, 0),
  side: STOCK_PILE_ID,
  rails: {
    left: FOUNDATIONS.map((pileId) => ({ pileId, overlapped: true })),
    right: [
      { pileId: STOCK_PILE_ID },
      {
        pileId: WASTE_PILE_ID,
        spreadsDown: true,
        reach: CARD_HEIGHT_PX + (WASTE_MAX_FAN_CARDS - 1) * WASTE_FAN_OFFSET_X,
      },
    ],
  },
  // Eight hidden cards under a run from king to two, on the deepest of the
  // nine columns. The grid with the piles below grows to 1237 for it, which
  // costs no card size at eleven columns wide.
  longestColumn: { faceDown: TABLEAU_COUNT - 1, faceUp: 12 },
});
