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
import { CanfieldVariant } from "./canfield_rules";
import {
  BOARD_COLUMN_COUNT,
  RESERVE_PILE_ID,
  STOCK_PILE_ID,
  WASTE_PILE_ID,
  canfieldZoneSpecs,
} from "./canfield_zones";

/**
 * The zones the grids are read from. Any variant would do: they change the
 * rules and how the reserve is drawn, not the grid.
 */
const ZONES = canfieldZoneSpecs(CanfieldVariant.CANFIELD);

/** The foundations, left to right. */
const FOUNDATIONS = pileIdsInRow(ZONES, 0).filter(
  (pileId) => pileId !== STOCK_PILE_ID && pileId !== WASTE_PILE_ID,
);

/**
 * The board the Canfield family shares: stock, waste and foundations along
 * the top, the reserve under the stock and four columns under the
 * foundations.
 */
export const CANFIELD_LAYOUT = boardLayout({
  columns: BOARD_COLUMN_COUNT,
  rows: 2,
  zones: ZONES,
  // A fourteen-card column, or Superior Canfield's fanned reserve, ends about
  // 1347 from the top of the board, with a hovered card open.
  designHeightPx: 1347,
});

/**
 * The Canfield board in every arrangement. The stock and waste go with the
 * foundations above the columns or along the bottom, at whichever side the
 * player asks for, and the reserve follows the stock to that side, the
 * columns staying under the foundations. On a phone on its side, the stock
 * tops one rail, with the waste spreading down under it, and the foundations
 * stack down the other; the reserve stands between the stock and the columns,
 * which is why the stock is declared on the left rail, the reserve's side.
 */
export const CANFIELD_ARRANGED_LAYOUTS = arrangedLayouts({
  roomy: CANFIELD_LAYOUT,
  columns: pileIdsInRow(ZONES, 1).filter(
    (pileId) => pileId !== RESERVE_PILE_ID,
  ),
  beside: [RESERVE_PILE_ID],
  row: pilesInRow(ZONES, 0),
  side: STOCK_PILE_ID,
  rails: {
    left: [
      { pileId: STOCK_PILE_ID },
      {
        pileId: WASTE_PILE_ID,
        spreadsDown: true,
        // Room for a draw of three, whichever the variant deals.
        reach: CARD_HEIGHT_PX + (WASTE_MAX_FAN_CARDS - 1) * WASTE_FAN_OFFSET_X,
      },
    ],
    right: FOUNDATIONS.map((pileId) => ({ pileId, overlapped: true })),
  },
  // Fourteen cards, a column or Superior Canfield's fanned reserve. The grid
  // with the piles below needs no more height than the grid above has.
  longestColumn: { faceDown: 0, faceUp: 14 },
});
