import { boardLayout } from "../common/board_layout";
import {
  arrangedLayouts,
  pileIdsInRow,
  pilesInRow,
} from "../common/arranged_layouts";
import { TABLEAU_COUNT, bakersDozenZoneSpecs } from "./bakers_dozen_zones";

/** The zones the grids are read from. */
const ZONES = bakersDozenZoneSpecs();

/**
 * The Baker's Dozen board: thirteen columns wide, with the four foundations at
 * the right of an otherwise empty top row.
 */
export const BAKERS_DOZEN_LAYOUT = boardLayout({
  columns: TABLEAU_COUNT,
  rows: 2,
  zones: ZONES,
  // A twelve-card column, deeper than a real game reaches, ends about 1202
  // from the top of the board.
  designHeightPx: 1227,
});

/**
 * The Baker's Dozen board in every arrangement. The foundations go above the
 * columns or along the bottom, always at the right, since a row of
 * foundations alone has no side worth choosing. On a phone on its side, they
 * stack down one rail.
 */
export const BAKERS_DOZEN_ARRANGED_LAYOUTS = arrangedLayouts({
  roomy: BAKERS_DOZEN_LAYOUT,
  columns: pileIdsInRow(ZONES, 1),
  row: pilesInRow(ZONES, 0),
  rails: {
    left: [],
    right: pileIdsInRow(ZONES, 0).map((pileId) => ({
      pileId,
      overlapped: true,
    })),
  },
  // Twelve cards, as the grid above makes room for. The grid with the piles
  // below needs no more height than the grid above has.
  longestColumn: { faceDown: 0, faceUp: 12 },
});
