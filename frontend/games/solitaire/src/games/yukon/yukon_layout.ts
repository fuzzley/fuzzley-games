import { boardLayout } from "../common/board_layout";
import {
  arrangedLayouts,
  pileIdsInRow,
  pilesInRow,
} from "../common/arranged_layouts";
import { DEFAULT_YUKON_VARIANT } from "./yukon_rules";
import { TABLEAU_COUNT, yukonZoneSpecs } from "./yukon_zones";

/**
 * The zones the grids are read from. Any variant would do: it changes the
 * rules, not the grid.
 */
const ZONES = yukonZoneSpecs(DEFAULT_YUKON_VARIANT);

/**
 * The Yukon board: four foundations at the right of the top row, seven columns
 * filling the bottom, and nothing at all at the top left.
 */
export const YUKON_LAYOUT = boardLayout({
  columns: TABLEAU_COUNT,
  rows: 2,
  zones: ZONES,
  // The last column is dealt eleven deep, six buried under five face up, and
  // only grows from there.
  designHeightPx: 1077,
});

/**
 * The Yukon board in every arrangement. The foundations go above the columns
 * or along the bottom, always at the right, since a row of foundations alone
 * has no side worth choosing. On a phone on its side, they stack down one rail.
 */
export const YUKON_ARRANGED_LAYOUTS = arrangedLayouts({
  roomy: YUKON_LAYOUT,
  columns: pileIdsInRow(ZONES, 1),
  row: pilesInRow(ZONES, 0),
  rails: {
    left: [],
    right: pileIdsInRow(ZONES, 0).map((pileId) => ({
      pileId,
      overlapped: true,
    })),
  },
  // Six hidden cards under a run from king to ace. The grid with the piles
  // below needs 1253, which keeps the cards 86% of the grid above's on a
  // 1920 × 1080 window, so it takes no cap.
  longestColumn: { faceDown: 6, faceUp: 13 },
});
