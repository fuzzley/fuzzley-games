import { ZoneSpec } from "@/engine/tableau/zones/zone";
import { OPEN_COLUMN_LAYOUT } from "../common/pile_layouts";
import { cellRow, columnRow, foundationRow } from "../common/zone_presets";
import {
  FreeCellRole,
  FreeCellVariant,
  freeCellColumn,
  FREECELL_CELL_RULE,
  FREECELL_FOUNDATION_RULE,
} from "./freecell_rules";

/** The number of free cells. */
export const CELL_COUNT = 4;

/** The number of suit foundation piles. */
export const FOUNDATION_COUNT = 4;

/** The number of tableau columns. */
export const TABLEAU_COUNT = 8;

/**
 * Returns the sixteen zones of a FreeCell board under a variant: cells and
 * foundations along the top, eight columns below.
 */
export function freeCellZoneSpecs(
  variant: FreeCellVariant,
): readonly ZoneSpec[] {
  return [
    ...cellRow({
      count: CELL_COUNT,
      column: 0,
      row: 0,
      role: FreeCellRole.CELL,
      accept: FREECELL_CELL_RULE,
    }),
    ...foundationRow({
      count: FOUNDATION_COUNT,
      column: CELL_COUNT,
      row: 0,
      role: FreeCellRole.FOUNDATION,
      accept: FREECELL_FOUNDATION_RULE,
    }),
    ...columnRow({
      count: TABLEAU_COUNT,
      column: 0,
      row: 1,
      role: FreeCellRole.TABLEAU,
      ...freeCellColumn(variant),
      layout: OPEN_COLUMN_LAYOUT,
      face: "always-up",
    }),
  ];
}

/** Re-exported: the roles and variants live with the rules that use them. */
export { FreeCellRole, FreeCellVariant };
