import { isSameSuitRun } from "@/engine/tableau/rules";
import { ZoneSpec } from "@/engine/tableau/zone";
import { STOCK_PILE_ID } from "../common/pile_ids";
import {
  CLOSED_STOCK_PLACEHOLDER,
  columnRow,
  foundationRow,
  stockZone,
} from "../common/zone_presets";
import { SpideretteRole, SPIDERETTE_TABLEAU_RULE } from "./spiderette_rules";

/** The number of tableau columns. */
export const TABLEAU_COUNT = 7;

/** The number of completed runs a full game produces: one per suit. */
export const FOUNDATION_COUNT = 4;

export { STOCK_PILE_ID };

/** The grid column the leftmost foundation sits in, at the right of the row. */
export const FOUNDATION_COLUMN_OFFSET = TABLEAU_COUNT - FOUNDATION_COUNT;

/** Returns the twelve zones of a Spiderette board, alike in both variants. */
export function spideretteZoneSpecs(): readonly ZoneSpec[] {
  return ZONES;
}

const ZONES: readonly ZoneSpec[] = [
  stockZone({
    id: STOCK_PILE_ID,
    role: SpideretteRole.STOCK,
    column: 0,
    row: 0,
    accept: null,
    backgroundKey: CLOSED_STOCK_PLACEHOLDER,
  }),
  ...foundationRow({
    count: FOUNDATION_COUNT,
    column: FOUNDATION_COLUMN_OFFSET,
    row: 0,
    role: SpideretteRole.FOUNDATION,
    // Never a drop target: a run arrives here by completing itself.
    accept: null,
    grab: { kind: "none" },
    draggable: false,
  }),
  ...columnRow({
    count: TABLEAU_COUNT,
    column: 0,
    row: 1,
    role: SpideretteRole.TABLEAU,
    accept: SPIDERETTE_TABLEAU_RULE,
    grab: { kind: "run", adjacent: isSameSuitRun },
  }),
];

/** Re-exported: the roles live with the rules that use them. */
export { SpideretteRole };
