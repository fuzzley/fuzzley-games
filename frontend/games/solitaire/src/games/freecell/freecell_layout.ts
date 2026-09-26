import { boardLayout } from "../common/board_layout";
import {
  FreeCellVariant,
  TABLEAU_COUNT,
  freeCellZoneSpecs,
} from "./freecell_zones";

/**
 * The FreeCell board: eight columns wide, with the four cells and the four
 * foundations sharing the top row and the columns filling the bottom.
 *
 * Any variant would do for reading the zones: it changes the rules, not the
 * grid.
 */
export const FREECELL_LAYOUT = boardLayout({
  columns: TABLEAU_COUNT,
  rows: 2,
  zones: freeCellZoneSpecs(FreeCellVariant.FREECELL),
  // A column can reach thirteen cards deep at 45 units apart, so the board
  // reserves rather more below its grid than Klondike does.
  designHeightPx: 1120,
});
