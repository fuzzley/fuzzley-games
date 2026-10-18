import { boardLayout } from "../common/board_layout";
import {
  arrangedLayouts,
  pileIdsInRow,
  pilesInRow,
} from "../common/arranged_layouts";
import { cellPileId, foundationPileId } from "../common/pile_ids";
import {
  CELL_COUNT,
  FOUNDATION_COUNT,
  FreeCellVariant,
  TABLEAU_COUNT,
  freeCellZoneSpecs,
} from "./freecell_zones";

/**
 * The zones the grids are read from. Any variant would do: it changes the
 * rules, not the grid.
 */
const ZONES = freeCellZoneSpecs(FreeCellVariant.FREECELL);

/**
 * The FreeCell board: eight columns wide, with the four cells and the four
 * foundations sharing the top row and the columns filling the bottom.
 */
export const FREECELL_LAYOUT = boardLayout({
  columns: TABLEAU_COUNT,
  rows: 2,
  zones: ZONES,
  // A column can reach thirteen cards deep at 45 units apart, so the board
  // reserves rather more below its grid than Klondike does.
  designHeightPx: 1047,
});

/**
 * The FreeCell board in every arrangement. The free cells go with the
 * foundations above the columns or along the bottom, the cells at whichever
 * side the player asks for. On a phone on its side, the cells stack down one
 * rail and the foundations the other, each showing as much of its card as the
 * rail has room for.
 */
export const FREECELL_ARRANGED_LAYOUTS = arrangedLayouts({
  roomy: FREECELL_LAYOUT,
  columns: pileIdsInRow(ZONES, 1),
  row: pilesInRow(ZONES, 0),
  side: cellPileId(0),
  rails: {
    left: Array.from({ length: CELL_COUNT }, (_, index) => ({
      pileId: cellPileId(index),
      overlapped: true,
    })),
    right: Array.from({ length: FOUNDATION_COUNT }, (_, index) => ({
      pileId: foundationPileId(index),
      overlapped: true,
    })),
  },
  // Thirteen cards: seven dealt, and a run built on them. The grid with the
  // piles below needs 1193, which keeps the cards 90% of the grid above's on a
  // 1920 × 1080 window, so it takes no cap.
  longestColumn: { faceDown: 0, faceUp: 13 },
});
