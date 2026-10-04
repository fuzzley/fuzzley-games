import { isSameSuitRun } from "@/engine/tableau/rules";
import { ZoneSpec } from "@/engine/tableau/zone";
import { OPEN_COLUMN_LAYOUT } from "../common/pile_layouts";
import { columnRow, foundationRow } from "../common/zone_presets";
import {
  DEFAULT_SIMPLE_SIMON_VARIANT,
  SimpleSimonRole,
  SimpleSimonVariant,
  simpleSimonFoundationCount,
  simpleSimonTableauCount,
  SIMPLE_SIMON_TABLEAU_RULE,
} from "./simple_simon_rules";

/**
 * Returns the zones of a Simple Simon board under a variant: the columns, and
 * the foundations at the right of the row above them.
 */
export function simpleSimonZoneSpecs(
  variant: SimpleSimonVariant = DEFAULT_SIMPLE_SIMON_VARIANT,
): readonly ZoneSpec[] {
  const tableauCount = simpleSimonTableauCount(variant);
  const foundationCount = simpleSimonFoundationCount(variant);
  return [
    ...foundationRow({
      count: foundationCount,
      column: tableauCount - foundationCount,
      row: 0,
      role: SimpleSimonRole.FOUNDATION,
      // Never a drop target: a run arrives here by completing itself, not by
      // being put here, and taking one back apart is not a move.
      accept: null,
      grab: { kind: "none" },
      draggable: false,
    }),
    ...columnRow({
      count: tableauCount,
      column: 0,
      row: 1,
      role: SimpleSimonRole.TABLEAU,
      accept: SIMPLE_SIMON_TABLEAU_RULE,
      grab: { kind: "run", adjacent: isSameSuitRun },
      layout: OPEN_COLUMN_LAYOUT,
      face: "always-up",
    }),
  ];
}

/** Re-exported: the roles and variants live with the rules that shape them. */
export { SimpleSimonRole, SimpleSimonVariant };
