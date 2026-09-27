import { ZoneSpec } from "@/engine/tableau/zone";
import { OPEN_COLUMN_LAYOUT } from "../common/pile_layouts";
import { cellRow, columnRow, foundationRow } from "../common/zone_presets";
import {
  FreeCellRole,
  FreeCellVariant,
  freeCellPlacementRule,
  freeCellRunAdjacency,
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
      accept: freeCellPlacementRule(FreeCellRole.CELL, variant),
    }),
    ...foundationRow({
      count: FOUNDATION_COUNT,
      column: CELL_COUNT,
      row: 0,
      role: FreeCellRole.FOUNDATION,
      accept: freeCellPlacementRule(FreeCellRole.FOUNDATION, variant),
    }),
    ...columnRow({
      count: TABLEAU_COUNT,
      column: 0,
      row: 1,
      role: FreeCellRole.TABLEAU,
      accept: freeCellPlacementRule(FreeCellRole.TABLEAU, variant),
      grab: { kind: "run", adjacent: freeCellRunAdjacency(variant) },
      layout: OPEN_COLUMN_LAYOUT,
      face: "always-up",
    }),
  ];
}

/** Re-exported: the roles and variants live with the rules that branch on them. */
export { FreeCellRole, FreeCellVariant };
