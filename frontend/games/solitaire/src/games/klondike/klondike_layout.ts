import { CARD_HEIGHT_PX } from "@/engine/render/layout/card_metrics";
import { boardLayout } from "../common/board_layout";
import {
  WASTE_FAN_OFFSET_X,
  WASTE_MAX_FAN_CARDS,
} from "../common/pile_layouts";
import {
  arrangedLayouts,
  pileIdsInRow,
  pilesInRow,
} from "../common/arranged_layouts";
import {
  STOCK_PILE_ID,
  TABLEAU_COUNT,
  WASTE_PILE_ID,
  klondikeZoneSpecs,
} from "./klondike_zones";
import { DEFAULT_DRAW_COUNT } from "./klondike_rules";

/**
 * The zones the grids are read from. Any draw mode would do: it changes the
 * waste fan, not where the piles sit.
 */
const ZONES = klondikeZoneSpecs(DEFAULT_DRAW_COUNT);

/** The foundations, left to right. */
const FOUNDATIONS = pileIdsInRow(ZONES, 0).filter(
  (pileId) => pileId !== STOCK_PILE_ID && pileId !== WASTE_PILE_ID,
);

/**
 * The Klondike board: stock and waste at the left of the top row, foundations
 * at the right of it, and the tableau columns filling the bottom row.
 */
export const KLONDIKE_LAYOUT = boardLayout({
  columns: TABLEAU_COUNT,
  rows: 2,
  zones: ZONES,
  // The grid alone needs 746; the rest is room for a column to fan into.
  designHeightPx: 877,
});

/**
 * The Klondike board in every arrangement. The stock and waste go with the
 * foundations above the columns or along the bottom, at whichever side the
 * player asks for. On a phone on its side, the foundations stack down one rail
 * and the stock tops the other, with the waste spreading down under it.
 */
export const KLONDIKE_ARRANGED_LAYOUTS = arrangedLayouts({
  roomy: KLONDIKE_LAYOUT,
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
        // Room for a draw of three, whichever the player chose.
        reach: CARD_HEIGHT_PX + (WASTE_MAX_FAN_CARDS - 1) * WASTE_FAN_OFFSET_X,
      },
    ],
  },
  // Six hidden cards under a run from king to two.
  longestColumn: { faceDown: TABLEAU_COUNT - 1, faceUp: 12 },
  // Cards 85% the size of the grid above's on a 1920 × 1080 window; six
  // hidden cards under eleven face up still clear the row.
  roomyBottomMaxHeightPx: 1184,
});
