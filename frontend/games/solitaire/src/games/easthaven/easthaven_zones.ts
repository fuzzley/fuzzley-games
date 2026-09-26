import { isOrderedPair } from "@/engine/tableau/rules";
import { ZoneSpec } from "@/engine/tableau/zone";
import { STOCK_PILE_ID } from "../common/pile_ids";
import {
  CLOSED_STOCK_PLACEHOLDER,
  columnRow,
  foundationRow,
  stockZone,
} from "../common/zone_presets";
import { EasthavenRole, easthavenPlacementRule } from "./easthaven_rules";

/** The number of tableau columns. */
export const TABLEAU_COUNT = 7;

/** The number of suit foundation piles. */
export const FOUNDATION_COUNT = 4;

export { STOCK_PILE_ID };

/** The grid column the leftmost foundation sits in, at the right of the row. */
export const FOUNDATION_COLUMN_OFFSET = TABLEAU_COUNT - FOUNDATION_COUNT;

/** Returns the twelve zones of an Easthaven board. */
export function easthavenZoneSpecs(): readonly ZoneSpec[] {
  return ZONES;
}

const ZONES: readonly ZoneSpec[] = [
  stockZone({
    id: STOCK_PILE_ID,
    role: EasthavenRole.STOCK,
    column: 0,
    row: 0,
    accept: easthavenPlacementRule(EasthavenRole.STOCK),
    backgroundKey: CLOSED_STOCK_PLACEHOLDER,
  }),
  ...foundationRow({
    count: FOUNDATION_COUNT,
    column: FOUNDATION_COLUMN_OFFSET,
    row: 0,
    role: EasthavenRole.FOUNDATION,
    accept: easthavenPlacementRule(EasthavenRole.FOUNDATION),
  }),
  ...columnRow({
    count: TABLEAU_COUNT,
    column: 0,
    row: 1,
    role: EasthavenRole.TABLEAU,
    accept: easthavenPlacementRule(EasthavenRole.TABLEAU),
    grab: { kind: "run", adjacent: isOrderedPair },
  }),
];

/** Re-exported: the roles live with the rules that branch on them. */
export { EasthavenRole };
