import { CARD_HEIGHT_PX } from "@/engine/render/layout/card_metrics";
import { PileLayout } from "@/engine/render/layout/pile_layout";
import { boardLayout } from "../common/board_layout";
import {
  phoneLayouts,
  pileIdsInRow,
  pilesInRow,
} from "../common/phone_layouts";
import { STOCK_PILE_ID, TABLEAU_COUNT, spiderZoneSpecs } from "./spider_zones";

/** The zones the grids are read from. */
const ZONES = spiderZoneSpecs();

/** The foundations, left to right. */
const FOUNDATIONS = pileIdsInRow(ZONES, 0).filter(
  (pileId) => pileId !== STOCK_PILE_ID,
);

/** How many deals the stock holds: fifty cards, one to each column a deal. */
const STOCK_DEALS = 5;

/** The gap between the stock's slivers on a phone, in design units. */
const STOCK_SLIVER_GAP = 40;

/**
 * How the stock arranges its cards on a phone: one sliver for each deal still
 * to come, so a player can see how many are left.
 */
const SLIVER_STOCK: PileLayout = {
  kind: "spread",
  direction: "right",
  gap: STOCK_SLIVER_GAP,
  maxVisible: STOCK_DEALS,
  groupSize: TABLEAU_COUNT,
};

/**
 * The Spider board: ten columns wide, with the stock alone at the left of the
 * top row and the eight foundations filling the right of it.
 */
export const SPIDER_LAYOUT = boardLayout({
  columns: TABLEAU_COUNT,
  rows: 2,
  zones: ZONES,
  // An opening six plus five dealt rows reaches about 1237 from the top of the
  // board.
  designHeightPx: 1277,
});

/**
 * The Spider board on a phone. Upright, the stock comes to the bottom right and
 * the foundations to the bottom left, or stay above the columns. On its side,
 * the stock and then the foundations stack down a rail at the right.
 */
export const SPIDER_PHONE_LAYOUTS = phoneLayouts({
  columns: pileIdsInRow(ZONES, 1),
  row: pilesInRow(ZONES, 0),
  rails: {
    left: [],
    right: [
      {
        pileId: STOCK_PILE_ID,
        spreadsDown: true,
        reach: CARD_HEIGHT_PX + (STOCK_DEALS - 1) * STOCK_SLIVER_GAP,
      },
      ...FOUNDATIONS.map((pileId) => ({ pileId, overlapped: true })),
    ],
  },
  // Five hidden cards under fifteen face up, most of the way to a king's run
  // and the deals stacked on it.
  longestColumn: { faceDown: 5, faceUp: 15 },
  pileLayouts: { [STOCK_PILE_ID]: () => SLIVER_STOCK },
});
