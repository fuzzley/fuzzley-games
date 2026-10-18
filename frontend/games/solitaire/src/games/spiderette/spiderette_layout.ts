import { boardLayout } from "../common/board_layout";
import {
  arrangedLayouts,
  pileIdsInRow,
  pilesInRow,
} from "../common/arranged_layouts";
import { sliverStockLayout, sliverStockReach } from "../common/pile_layouts";
import {
  STOCK_PILE_ID,
  TABLEAU_COUNT,
  spideretteZoneSpecs,
} from "./spiderette_zones";

/** The zones the grids are read from, alike in both variants. */
const ZONES = spideretteZoneSpecs();

/** The foundations, left to right. */
const FOUNDATIONS = pileIdsInRow(ZONES, 0).filter(
  (pileId) => pileId !== STOCK_PILE_ID,
);

/**
 * How many deals the stock holds at most: Will o' the Wisp's thirty-one cards,
 * seven to a deal.
 */
const STOCK_DEALS = 5;

/**
 * The Spiderette board: seven columns, with the stock alone at the left of the
 * top row and the four foundations at the right of it.
 *
 * At seven columns height binds the scale, so every design unit reserved below
 * the grid costs card size.
 */
export const SPIDERETTE_LAYOUT = boardLayout({
  columns: TABLEAU_COUNT,
  rows: 2,
  zones: ZONES,
  // Six buried cards and eight showing reach about 1027 from the top of the
  // board.
  designHeightPx: 1077,
});

/**
 * The Spiderette board in every arrangement. The stock goes with the
 * foundations above the columns or along the bottom, at whichever side the
 * player asks for, and shows one sliver per deal on a phone. On a phone on its
 * side, the stock and then the foundations stack down one rail.
 */
export const SPIDERETTE_ARRANGED_LAYOUTS = arrangedLayouts({
  roomy: SPIDERETTE_LAYOUT,
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
  // Six hidden cards under a run from king to ace. The grid with the piles
  // below needs 1253, which keeps the cards 86% of the grid above's on a
  // 1920 × 1080 window, so it takes no cap.
  longestColumn: { faceDown: 6, faceUp: 13 },
  pileLayouts: {
    [STOCK_PILE_ID]: () => sliverStockLayout(STOCK_DEALS, TABLEAU_COUNT),
  },
});
