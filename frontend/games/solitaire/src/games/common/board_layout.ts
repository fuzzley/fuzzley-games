import {
  TableLayoutSpec,
  tableLayout,
} from "@/engine/render/layout/table_layout";
import { ZoneSpec } from "@/engine/tableau/zone";

/** The grid a board lies on, taken from the zones that sit on it. */
export interface BoardLayoutOptions {
  /** How many card-widths across the grid is. */
  readonly columns: number;
  /** How many card-heights down the grid is. */
  readonly rows: number;
  /** The zones whose slots make up the board. */
  readonly zones: readonly ZoneSpec[];
  /** See {@link TableLayoutSpec.designHeightPx}. */
  readonly designHeightPx?: number;
}

/**
 * The layout for a board made of the given zones.
 *
 * Every game derived its slots with the same line — `zoneSpecs().map((zone) =>
 * zone.slot)` — which is the layout tier restating that a zone knows where it
 * sits. Saying it once leaves each game's layout file to the two things that
 * are actually its own: how wide the grid is, and how much room its columns
 * need to fan into.
 */
export function boardLayout(options: BoardLayoutOptions): TableLayoutSpec {
  const { columns, rows, zones, designHeightPx } = options;
  return tableLayout({
    columns,
    rows,
    slots: zones.map((zone) => zone.slot),
    designHeightPx,
  });
}
