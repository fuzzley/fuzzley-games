import { boardLayout } from "../common/board_layout";
import {
  arrangedLayouts,
  pileIdsInRow,
  pilesInRow,
} from "../common/arranged_layouts";
import {
  STOCK_PILE_ID,
  TABLEAU_COUNT,
  scorpionZoneSpecs,
} from "./scorpion_zones";

/**
 * The zones the grids are read from. Any variant would do: it changes what a
 * column accepts, not where the piles sit.
 */
const ZONES = scorpionZoneSpecs();

/** The foundations, left to right. */
const FOUNDATIONS = pileIdsInRow(ZONES, 0).filter(
  (pileId) => pileId !== STOCK_PILE_ID,
);

/**
 * The Scorpion board: seven columns, with the stock alone at the left of the
 * top row and the four foundations at the right of it.
 */
export const SCORPION_LAYOUT = boardLayout({
  columns: TABLEAU_COUNT,
  rows: 2,
  zones: ZONES,
  // Room for the two or three deep stacks a board collects into before the
  // first run completes.
  designHeightPx: 1077,
});

/**
 * The Scorpion board in every arrangement. The stock goes with the foundations
 * above the columns or along the bottom, at whichever side the player asks
 * for. On a phone on its side, the stock and then the foundations stack down
 * one rail.
 */
export const SCORPION_ARRANGED_LAYOUTS = arrangedLayouts({
  roomy: SCORPION_LAYOUT,
  columns: pileIdsInRow(ZONES, 1),
  row: pilesInRow(ZONES, 0),
  side: STOCK_PILE_ID,
  rails: {
    left: [],
    right: [
      { pileId: STOCK_PILE_ID },
      ...FOUNDATIONS.map((pileId) => ({ pileId, overlapped: true })),
    ],
  },
  // Three hidden cards under fifteen face up: a run from king to ace with the
  // cards a move carried onto it.
  longestColumn: { faceDown: 3, faceUp: 15 },
  // Cards 85% the size of the grid above's on a 1920 × 1080 window; three
  // hidden cards under fourteen face up still clear the row.
  roomyBottomMaxHeightPx: 1267,
});
