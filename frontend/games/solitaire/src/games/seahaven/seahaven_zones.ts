import { isSameSuitRun } from "@/engine/tableau/rules";
import { ZoneSpec } from "@/engine/tableau/zone";
import { OPEN_COLUMN_LAYOUT } from "../common/pile_layouts";
import { cellRow, columnRow, foundationRow } from "../common/zone_presets";
import { SeahavenRole, seahavenPlacementRule } from "./seahaven_rules";

/** The number of holding cells. */
export const CELL_COUNT = 4;

/** The number of suit foundation piles. */
export const FOUNDATION_COUNT = 4;

/** The number of tableau columns. */
export const TABLEAU_COUNT = 10;

/** The grid column the leftmost foundation sits in, at the right of the row. */
export const FOUNDATION_COLUMN_OFFSET = TABLEAU_COUNT - FOUNDATION_COUNT;

/** Returns the eighteen zones of a Seahaven Towers board. */
export function seahavenZoneSpecs(): readonly ZoneSpec[] {
  return ZONES;
}

const ZONES: readonly ZoneSpec[] = [
  ...cellRow({
    count: CELL_COUNT,
    column: 0,
    row: 0,
    role: SeahavenRole.CELL,
    accept: seahavenPlacementRule(SeahavenRole.CELL),
  }),
  ...foundationRow({
    count: FOUNDATION_COUNT,
    column: FOUNDATION_COLUMN_OFFSET,
    row: 0,
    role: SeahavenRole.FOUNDATION,
    accept: seahavenPlacementRule(SeahavenRole.FOUNDATION),
  }),
  ...columnRow({
    count: TABLEAU_COUNT,
    column: 0,
    row: 1,
    role: SeahavenRole.TABLEAU,
    accept: seahavenPlacementRule(SeahavenRole.TABLEAU),
    grab: { kind: "run", adjacent: isSameSuitRun },
    layout: OPEN_COLUMN_LAYOUT,
    face: "always-up",
  }),
];

/** Re-exported: the roles live with the rules that branch on them. */
export { SeahavenRole };
