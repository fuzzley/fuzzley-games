import { ZoneSpec } from "@/engine/tableau/zone";
import { zoneAt } from "@/engine/tableau/zone_builder";
import { STOCK_PILE_ID, foundationPileId } from "../common/pile_ids";
import {
  OPEN_COLUMN_LAYOUT,
  STACKED_PILE_LAYOUT,
} from "../common/pile_layouts";
import {
  CLOSED_STOCK_PLACEHOLDER,
  FOUNDATION_PLACEHOLDER,
  columnRow,
  stockZone,
} from "../common/zone_presets";
import { GolfRole, GolfVariant, golfFoundationRule } from "./golf_rules";

/** The number of columns. */
export const TABLEAU_COUNT = 7;

/** The stable id of the single foundation. */
export const FOUNDATION_PILE_ID = foundationPileId(0);

export { STOCK_PILE_ID };

/**
 * Returns the zones of a Golf board under a variant: the stock and the
 * foundation beside it along the top, and the columns beneath.
 */
export function golfZoneSpecs(variant: GolfVariant): readonly ZoneSpec[] {
  return [
    stockZone({
      id: STOCK_PILE_ID,
      role: GolfRole.STOCK,
      column: 0,
      row: 0,
      accept: null,
      // No `emptyIsActionable`: the stock is turned only once.
      backgroundKey: CLOSED_STOCK_PLACEHOLDER,
    }),
    zoneAt({
      id: FOUNDATION_PILE_ID,
      role: GolfRole.FOUNDATION,
      column: 1,
      row: 0,
      accept: golfFoundationRule(variant),
      layout: STACKED_PILE_LAYOUT,
      // A card played is played for good.
      grab: { kind: "none" },
      draggable: false,
      face: "always-up",
      backgroundKey: FOUNDATION_PLACEHOLDER,
    }),
    ...columnRow({
      count: TABLEAU_COUNT,
      column: 0,
      row: 1,
      role: GolfRole.TABLEAU,
      // Nothing builds on a column: cards only leave it.
      accept: null,
      grab: { kind: "top-only" },
      layout: OPEN_COLUMN_LAYOUT,
      face: "always-up",
    }),
  ];
}

/** Re-exported: the roles and variants live with the rules that shape them. */
export { GolfRole, GolfVariant };
