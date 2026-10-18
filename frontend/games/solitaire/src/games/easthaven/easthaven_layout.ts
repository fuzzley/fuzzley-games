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
  easthavenZoneSpecs,
} from "./easthaven_zones";

/** The zones the grids are read from. */
const ZONES = easthavenZoneSpecs();

/** The foundations, left to right. */
const FOUNDATIONS = pileIdsInRow(ZONES, 0).filter(
  (pileId) => pileId !== STOCK_PILE_ID,
);

/** How many deals the stock holds: thirty-one cards, seven to a deal. */
const STOCK_DEALS = 5;

/**
 * The Easthaven board: seven columns, with the stock alone at the left of the
 * top row and the four foundations at the right of it.
 *
 * At seven columns height binds the scale, so every design unit reserved below
 * the grid costs card size.
 */
export const EASTHAVEN_LAYOUT = boardLayout({
  columns: TABLEAU_COUNT,
  rows: 2,
  zones: ZONES,
  // Two buried cards under nine showing reach about 927 from the top of the
  // board.
  designHeightPx: 1027,
});

/**
 * The Easthaven board in every arrangement. The stock goes with the
 * foundations above the columns or along the bottom, at whichever side the
 * player asks for, and shows one sliver per deal on a phone. On a phone on its
 * side, the stock and then the foundations stack down one rail.
 */
export const EASTHAVEN_ARRANGED_LAYOUTS = arrangedLayouts({
  roomy: EASTHAVEN_LAYOUT,
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
  // Two hidden cards under fourteen face up: a run from king to ace with a
  // dealt card on it.
  longestColumn: { faceDown: 2, faceUp: 14 },
  // Cards 85% the size of the grid above's on a 1920 × 1080 window; two hidden
  // cards under twelve face up still clear the row.
  roomyBottomMaxHeightPx: 1208,
  pileLayouts: {
    [STOCK_PILE_ID]: () => sliverStockLayout(STOCK_DEALS, TABLEAU_COUNT),
  },
});
