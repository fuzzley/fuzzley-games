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
import { TABLEAU_COUNT, scorpionZoneSpecs } from "./scorpion_zones";

/**
 * The Scorpion board: seven columns, with the stock alone at the left of the top
 * row and the four foundations at the right of it.
 *
 * Klondike's grid exactly, minus the waste — which is what a seven-column game
 * with no draw comes to.
 */
export const SCORPION_LAYOUT: TableLayoutSpec = {
  columns: TABLEAU_COUNT,
  rows: 2,
  slots: scorpionZoneSpecs().map((zone) => zone.slot),
  cardSize: { width: CARD_WIDTH_PX, height: CARD_HEIGHT_PX },
  gap: { x: LAYOUT_GAP_X, y: LAYOUT_GAP_Y },
  padding: { x: LAYOUT_PADDING_X, y: LAYOUT_PADDING_Y },
  headerHeightPx: HEADER_HEIGHT_PX,
  // Columns run deeper than Klondike's: every card that leaves a column joins
  // another, so a well-played board collects most of the deck into two or three
  // stacks before the first run completes. Reserving more than the grid needs
  // keeps the longest of them on screen.
  designHeightPx: 1150,
};
