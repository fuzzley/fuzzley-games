import {
  TableLayoutSpec,
  tableLayout,
} from "@/engine/render/layout/table_layout";
import { ZoneSpec } from "@/engine/tableau/zones/zone";

/** Describes the grid a board lies on and the zones that sit on it. */
export interface BoardLayoutOptions {
  /** How many card-widths across the grid is. */
  readonly columns: number;
  /** How many card-heights down the grid is. */
  readonly rows: number;
  /** The zones whose slots make up the board. */
  readonly zones: readonly ZoneSpec[];
  /** The design height the board reserves; see {@link TableLayoutSpec}. */
  readonly designHeightPx?: number;
}

/** Returns the layout for a board made of the given zones. */
export function boardLayout(options: BoardLayoutOptions): TableLayoutSpec {
  const { columns, rows, zones, designHeightPx } = options;
  return tableLayout({
    columns,
    rows,
    slots: zones.map((zone) => zone.slot),
    designHeightPx,
  });
}
