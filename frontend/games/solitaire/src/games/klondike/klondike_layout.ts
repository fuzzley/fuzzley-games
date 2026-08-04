import { boardLayout } from "../common/board_layout";
import { TABLEAU_COUNT, klondikeZoneSpecs } from "./klondike_zones";
import { DEFAULT_DRAW_COUNT } from "./klondike_settings";

/**
 * The Klondike board: stock and waste at the left of the top row, foundations
 * at the right of it, and the tableau columns filling the bottom row.
 *
 * The slots come from the zone specs rather than being restated here, so a pile
 * cannot be declared in one place and positioned in another. Which draw mode
 * they are read from does not matter — the fan varies with it, the grid does
 * not.
 */
export const KLONDIKE_LAYOUT = boardLayout({
  columns: TABLEAU_COUNT,
  rows: 2,
  zones: klondikeZoneSpecs(DEFAULT_DRAW_COUNT),
  // The grid alone needs 819, but a tableau column fans about a card and a half
  // below its row. This is the height the board was authored at, and it is what
  // keeps a long column on screen.
  designHeightPx: 950,
});
