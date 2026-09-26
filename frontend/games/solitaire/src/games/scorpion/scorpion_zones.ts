import { ZoneSpec } from "@/engine/tableau/zone";
import { STOCK_PILE_ID } from "../common/pile_ids";
import {
  CLOSED_STOCK_PLACEHOLDER,
  columnRow,
  foundationRow,
  stockZone,
} from "../common/zone_presets";
import { ScorpionRole, scorpionPlacementRule } from "./scorpion_rules";

/** The number of tableau columns. */
export const TABLEAU_COUNT = 7;

/** The number of completed runs a full game produces: one per suit. */
export const FOUNDATION_COUNT = 4;

export { STOCK_PILE_ID };

/** Returns the twelve zones of a Scorpion board. */
export function scorpionZoneSpecs(): readonly ZoneSpec[] {
  return ZONES;
}

const ZONES: readonly ZoneSpec[] = [
  stockZone({
    id: STOCK_PILE_ID,
    role: ScorpionRole.STOCK,
    column: 0,
    row: 0,
    accept: scorpionPlacementRule(ScorpionRole.STOCK),
    backgroundKey: CLOSED_STOCK_PLACEHOLDER,
  }),
  ...foundationRow({
    // Columns 1 and 2 stay clear, as in Klondike's top row.
    count: FOUNDATION_COUNT,
    column: 3,
    row: 0,
    role: ScorpionRole.FOUNDATION,
    // Never a drop target: a run arrives here by completing itself, not by
    // being put here.
    accept: scorpionPlacementRule(ScorpionRole.FOUNDATION),
    grab: { kind: "none" },
    draggable: false,
  }),
  ...columnRow({
    count: TABLEAU_COUNT,
    column: 0,
    row: 1,
    role: ScorpionRole.TABLEAU,
    accept: scorpionPlacementRule(ScorpionRole.TABLEAU),
    // Any face-up card lifts with everything on it, as in Yukon.
    grab: { kind: "any-face-up" },
  }),
];

/** Re-exported: the roles live with the rules that branch on them. */
export { ScorpionRole };
