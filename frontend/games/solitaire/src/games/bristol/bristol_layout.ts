import { boardLayout } from "../common/board_layout";
import {
  arrangedLayouts,
  pileIdsInRow,
  pilesInRow,
} from "../common/arranged_layouts";
import {
  RESERVE_COUNT,
  STOCK_PILE_ID,
  TABLEAU_COUNT,
  bristolZoneSpecs,
  reservePileId,
} from "./bristol_zones";

/** The zones the grids are read from, alike in both variants. */
const ZONES = bristolZoneSpecs();

/** The reserves, left to right. */
const RESERVES = Array.from({ length: RESERVE_COUNT }, (_, index) =>
  reservePileId(index),
);

/** The foundations, left to right. */
const FOUNDATIONS = pileIdsInRow(ZONES, 0).filter(
  (pileId) => pileId !== STOCK_PILE_ID && !RESERVES.includes(pileId),
);

/**
 * The board Bristol and Belvedere share: stock, reserves and foundations along
 * the top, and eight fans beneath.
 */
export const BRISTOL_LAYOUT = boardLayout({
  columns: TABLEAU_COUNT,
  rows: 2,
  zones: ZONES,
  // A fan can grow from its three cards to a dozen; one that long ends about
  // 1202 from the top of the board.
  designHeightPx: 1227,
});

/**
 * The Bristol board in every arrangement. The stock and reserves go with the
 * foundations above the fans or along the bottom, at whichever side the player
 * asks for. On a phone on its side, the foundations stack down one rail, and
 * the stock and then the reserves, each showing its top card's index, the
 * other.
 */
export const BRISTOL_ARRANGED_LAYOUTS = arrangedLayouts({
  roomy: BRISTOL_LAYOUT,
  columns: pileIdsInRow(ZONES, 1),
  row: pilesInRow(ZONES, 0),
  side: STOCK_PILE_ID,
  rails: {
    left: FOUNDATIONS.map((pileId) => ({ pileId, overlapped: true })),
    right: [
      { pileId: STOCK_PILE_ID },
      ...RESERVES.map((pileId) => ({ pileId, overlapped: true })),
    ],
  },
  // A fan grown from its three cards to thirteen. The grid with the piles
  // below needs no more height than the grid above has, so it takes no cap.
  longestColumn: { faceDown: 0, faceUp: 13 },
});
