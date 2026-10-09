import { boardLayout } from "../common/board_layout";
import { sliverStockLayout, sliverStockReach } from "../common/pile_layouts";
import {
  arrangedLayouts,
  pileIdsInRow,
  pilesInRow,
} from "../common/arranged_layouts";
import { STOCK_PILE_ID, TABLEAU_COUNT, spiderZoneSpecs } from "./spider_zones";

/** The zones the grids are read from. */
const ZONES = spiderZoneSpecs();

/** The foundations, left to right. */
const FOUNDATIONS = pileIdsInRow(ZONES, 0).filter(
  (pileId) => pileId !== STOCK_PILE_ID,
);

/** How many deals the stock holds: fifty cards, one to each column a deal. */
const STOCK_DEALS = 5;

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
 * The Spider board in every arrangement. The stock goes with the foundations
 * above the columns or along the bottom, at whichever side the player asks
 * for. On a phone on its side, the stock and then the foundations stack down
 * one rail.
 */
export const SPIDER_ARRANGED_LAYOUTS = arrangedLayouts({
  roomy: SPIDER_LAYOUT,
  columns: pileIdsInRow(ZONES, 1),
  row: pilesInRow(ZONES, 0),
  side: STOCK_PILE_ID,
  rails: {
    left: [],
    right: [
      {
        pileId: STOCK_PILE_ID,
        spreadsDown: true,
        reach: sliverStockReach(STOCK_DEALS),
      },
      ...FOUNDATIONS.map((pileId) => ({ pileId, overlapped: true })),
    ],
  },
  // Five hidden cards under fifteen face up, most of the way to a king's run
  // and the deals stacked on it.
  longestColumn: { faceDown: 5, faceUp: 15 },
  pileLayouts: {
    [STOCK_PILE_ID]: () => sliverStockLayout(STOCK_DEALS, TABLEAU_COUNT),
  },
});
