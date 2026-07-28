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
import { TABLEAU_COUNT, freeCellZoneSpecs } from "./freecell_zones";

/**
 * The FreeCell board: eight columns wide, with the four cells and the four
 * foundations sharing the top row and the columns filling the bottom.
 *
 * Eight columns rather than Klondike's seven, and nothing in the engine was
 * told about it — the design width falls out of the grid.
 */
export const FREECELL_LAYOUT: TableLayoutSpec = {
  columns: TABLEAU_COUNT,
  rows: 2,
  slots: freeCellZoneSpecs().map((zone) => zone.slot),
  cardSize: { width: CARD_WIDTH_PX, height: CARD_HEIGHT_PX },
  gap: { x: LAYOUT_GAP_X, y: LAYOUT_GAP_Y },
  padding: { x: LAYOUT_PADDING_X, y: LAYOUT_PADDING_Y },
  headerHeightPx: HEADER_HEIGHT_PX,
  // A column can reach thirteen cards deep at 45 units apart, so the board
  // reserves rather more below its grid than Klondike does.
  designHeightPx: 1120,
};
