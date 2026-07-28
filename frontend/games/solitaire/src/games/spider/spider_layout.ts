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
import { TABLEAU_COUNT, spiderZoneSpecs } from "./spider_zones";

/**
 * The Spider board: ten columns wide, with the stock alone at the left of the
 * top row and the eight foundations filling the right of it.
 *
 * A third board width after Klondike's seven and FreeCell's eight, and again
 * nothing in the engine was told: the design width falls out of the grid.
 */
export const SPIDER_LAYOUT: TableLayoutSpec = {
  columns: TABLEAU_COUNT,
  rows: 2,
  slots: spiderZoneSpecs().map((zone) => zone.slot),
  cardSize: { width: CARD_WIDTH_PX, height: CARD_HEIGHT_PX },
  gap: { x: LAYOUT_GAP_X, y: LAYOUT_GAP_Y },
  padding: { x: LAYOUT_PADDING_X, y: LAYOUT_PADDING_Y },
  headerHeightPx: HEADER_HEIGHT_PX,
  // Columns run deep in Spider: an opening six plus five dealt rows is eleven
  // cards, which at a 45-unit face-up gap reaches about 1310 from the top of
  // the board. Reserving that keeps the longest column on screen.
  designHeightPx: 1350,
};
