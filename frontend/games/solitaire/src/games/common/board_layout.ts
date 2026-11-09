import {
  type TableGridSpec,
  type TableLayoutSpec,
  tableLayout,
} from "@/engine/render/layout/table_layout";
import type { ZoneSpec } from "@/engine/tableau/zones/zone";

/** Describes the grid a board lies on and the zones that sit on it. */
export interface BoardLayoutOptions extends Pick<
  TableGridSpec,
  "columns" | "rows" | "designHeightPx"
> {
  /** The zones whose slots make up the board. */
  readonly zones: readonly ZoneSpec[];
}

/** Returns the layout for a board made of the given zones. */
export function boardLayout({
  zones,
  ...grid
}: BoardLayoutOptions): TableLayoutSpec {
  return tableLayout({ ...grid, slots: zones.map((zone) => zone.slot) });
}
