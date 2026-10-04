import { ZoneSpec } from "@/engine/tableau/zone";
import { zoneRow } from "@/engine/tableau/zone_builder";
import { STOCK_PILE_ID } from "../common/pile_ids";
import {
  OPEN_COLUMN_LAYOUT,
  STACKED_PILE_LAYOUT,
} from "../common/pile_layouts";
import {
  CLOSED_STOCK_PLACEHOLDER,
  PLAIN_PLACEHOLDER,
  columnRow,
  foundationRow,
  stockZone,
} from "../common/zone_presets";
import {
  BRISTOL_FOUNDATION_RULE,
  BRISTOL_TABLEAU_RULE,
  BristolRole,
} from "./bristol_rules";

/** The number of fans. */
export const TABLEAU_COUNT = 8;

/** The number of reserves the stock deals onto. */
export const RESERVE_COUNT = 3;

/** The grid column the first foundation sits in, at the right of the row. */
export const FOUNDATION_COLUMN_OFFSET = TABLEAU_COUNT - 4;

/** Returns the stable id of the reserve at the given index. */
export function reservePileId(index: number): string {
  return `reserve-${index}`;
}

export { STOCK_PILE_ID };

/**
 * Returns the zones of a Bristol board: stock, reserves and foundations along
 * the top, and the fans beneath.
 */
export function bristolZoneSpecs(): readonly ZoneSpec[] {
  return ZONES;
}

const ZONES: readonly ZoneSpec[] = [
  stockZone({
    id: STOCK_PILE_ID,
    role: BristolRole.STOCK,
    column: 0,
    row: 0,
    accept: null,
    // No `emptyIsActionable`: the stock is dealt only once.
    backgroundKey: CLOSED_STOCK_PLACEHOLDER,
  }),
  ...zoneRow({
    count: RESERVE_COUNT,
    id: reservePileId,
    column: 1,
    row: 0,
    role: BristolRole.RESERVE,
    // Filled only by the stock.
    accept: null,
    layout: STACKED_PILE_LAYOUT,
    grab: { kind: "top-only" },
    draggable: true,
    face: "always-up",
    backgroundKey: PLAIN_PLACEHOLDER,
  }),
  ...foundationRow({
    count: 4,
    column: FOUNDATION_COLUMN_OFFSET,
    row: 0,
    role: BristolRole.FOUNDATION,
    accept: BRISTOL_FOUNDATION_RULE,
  }),
  ...columnRow({
    count: TABLEAU_COUNT,
    column: 0,
    row: 1,
    role: BristolRole.TABLEAU,
    accept: BRISTOL_TABLEAU_RULE,
    grab: { kind: "top-only" },
    layout: OPEN_COLUMN_LAYOUT,
    face: "always-up",
  }),
];

/** Re-exported: the roles live with the rules that use them. */
export { BristolRole };
