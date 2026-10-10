import { ZoneSpec } from "@/engine/tableau/zones/zone";
import { OPEN_COLUMN_LAYOUT } from "../common/pile_layouts";
import { columnRow, foundationRow } from "../common/zone_presets";
import {
  BakersDozenRole,
  BAKERS_DOZEN_FOUNDATION_RULE,
  BAKERS_DOZEN_TABLEAU_RULE,
} from "./bakers_dozen_rules";

/** The number of tableau columns, which gives the game its name. */
export const TABLEAU_COUNT = 13;

/** The number of suit foundation piles. */
export const FOUNDATION_COUNT = 4;

/** The grid column the leftmost foundation sits in, at the right of the row. */
export const FOUNDATION_COLUMN_OFFSET = TABLEAU_COUNT - FOUNDATION_COUNT;

/** Returns the seventeen zones of a Baker's Dozen board. */
export function bakersDozenZoneSpecs(): readonly ZoneSpec[] {
  return ZONES;
}

const ZONES: readonly ZoneSpec[] = [
  ...foundationRow({
    count: FOUNDATION_COUNT,
    column: FOUNDATION_COLUMN_OFFSET,
    row: 0,
    role: BakersDozenRole.FOUNDATION,
    accept: BAKERS_DOZEN_FOUNDATION_RULE,
  }),
  ...columnRow({
    count: TABLEAU_COUNT,
    column: 0,
    row: 1,
    role: BakersDozenRole.TABLEAU,
    accept: BAKERS_DOZEN_TABLEAU_RULE,
    // One card at a time: with no cells and no refillable columns, nothing
    // could stage a run.
    grab: { kind: "top-only" },
    layout: OPEN_COLUMN_LAYOUT,
    face: "always-up",
  }),
];

/** Re-exported: the roles live with the rules that use them. */
export { BakersDozenRole };
