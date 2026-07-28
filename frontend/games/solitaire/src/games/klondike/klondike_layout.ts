import { TableLayoutSpec } from "@/engine/render/layout/table_layout";
import {
  CARD_HEIGHT_PX,
  CARD_WIDTH_PX,
  HEADER_HEIGHT_PX,
  LAYOUT_GAP_X,
  LAYOUT_GAP_Y,
  LAYOUT_PADDING_X,
  LAYOUT_PADDING_Y,
} from "@/engine/render/layout/card_metrics";
import { TABLEAU_COUNT, klondikeZoneSpecs } from "./klondike_zones";
import { DEFAULT_DRAW_COUNT } from "./game_settings";

/**
 * The Klondike board: stock and waste at the left of the top row, foundations
 * at the right of it, and the tableau columns filling the bottom row.
 *
 * The slots come from the zone specs rather than being restated here, so a pile
 * cannot be declared in one place and positioned in another. Which draw mode
 * they are read from does not matter — the fan varies with it, the grid does
 * not.
 */
export const KLONDIKE_LAYOUT: TableLayoutSpec = {
  columns: TABLEAU_COUNT,
  rows: 2,
  slots: klondikeZoneSpecs(DEFAULT_DRAW_COUNT).map((zone) => zone.slot),
  cardSize: { width: CARD_WIDTH_PX, height: CARD_HEIGHT_PX },
  gap: { x: LAYOUT_GAP_X, y: LAYOUT_GAP_Y },
  padding: { x: LAYOUT_PADDING_X, y: LAYOUT_PADDING_Y },
  headerHeightPx: HEADER_HEIGHT_PX,
  // The grid alone needs 819, but a tableau column fans about a card and a half
  // below its row. This is the height the board was authored at, and it is what
  // keeps a long column on screen.
  designHeightPx: 950,
};
