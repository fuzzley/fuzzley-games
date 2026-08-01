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
import { DEFAULT_YUKON_VARIANT } from "./yukon_rules";
import { TABLEAU_COUNT, yukonZoneSpecs } from "./yukon_zones";

/**
 * The Yukon board: four foundations at the right of the top row, seven columns
 * filling the bottom, and nothing at all at the top left.
 *
 * The foundations sit where Klondike puts them rather than being slid across to
 * close the gap. The empty corner is the point: a player reading the board sees
 * where the stock and the waste would be and finds them absent, which is the
 * first thing to know about this game.
 *
 * The slots come from the zone specs so a pile cannot be declared in one place
 * and positioned in another. Which variant they are read from does not matter —
 * the three differ only in what a column accepts — but the default is passed
 * explicitly rather than left to a fallback, so the choice is visible.
 */
export const YUKON_LAYOUT: TableLayoutSpec = {
  columns: TABLEAU_COUNT,
  rows: 2,
  slots: yukonZoneSpecs(DEFAULT_YUKON_VARIANT).map((zone) => zone.slot),
  cardSize: { width: CARD_WIDTH_PX, height: CARD_HEIGHT_PX },
  gap: { x: LAYOUT_GAP_X, y: LAYOUT_GAP_Y },
  padding: { x: LAYOUT_PADDING_X, y: LAYOUT_PADDING_Y },
  headerHeightPx: HEADER_HEIGHT_PX,
  // Taller than any other board here, because the last column is eleven cards
  // deep from the first deal: six packed face-down plus five fanned face-up,
  // and it only grows as cards are moved onto it.
  designHeightPx: 1150,
};
