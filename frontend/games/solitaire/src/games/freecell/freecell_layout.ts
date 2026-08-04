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
 * Eight columns rather than Klondike's seven, and nothing in the engine was
 * told about it — the design width falls out of the grid.
 *
 * Which variant the slots are read from does not matter — the rules vary with
 * it, the grid does not — so this serves Baker's Game unchanged.
 */
export const FREECELL_LAYOUT = boardLayout({
  columns: TABLEAU_COUNT,
  rows: 2,
  zones: freeCellZoneSpecs(FreeCellVariant.FREECELL),
  // A column can reach thirteen cards deep at 45 units apart, so the board
  // reserves rather more below its grid than Klondike does.
  designHeightPx: 1120,
});
