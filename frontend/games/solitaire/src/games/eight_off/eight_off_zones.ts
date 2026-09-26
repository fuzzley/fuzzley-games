import { isSameSuitRun } from "@/engine/tableau/rules";
import { ZoneSpec } from "@/engine/tableau/zone";
import { OPEN_COLUMN_LAYOUT } from "../common/pile_layouts";
import { cellRow, columnRow, foundationRow } from "../common/zone_presets";
import { EightOffRole, eightOffPlacementRule } from "./eight_off_rules";

/** The number of free cells, which gives the game its name. */
export const CELL_COUNT = 8;

/** The number of suit foundation piles. */
export const FOUNDATION_COUNT = 4;

/** The number of tableau columns. */
export const TABLEAU_COUNT = 8;

/**
 * How many grid columns the board is wide, set by the twelve piles of the top
 * row.
 */
export const BOARD_COLUMN_COUNT = CELL_COUNT + FOUNDATION_COUNT;

/**
 * The grid column the leftmost tableau starts in, centring the columns under
 * the top row.
 */
export const TABLEAU_COLUMN_OFFSET = Math.floor(
  (BOARD_COLUMN_COUNT - TABLEAU_COUNT) / 2,
);

/** Returns the twenty zones of an Eight Off board. */
export function eightOffZoneSpecs(): readonly ZoneSpec[] {
  return ZONES;
}

const ZONES: readonly ZoneSpec[] = [
  ...cellRow({
    count: CELL_COUNT,
    column: 0,
    row: 0,
    role: EightOffRole.CELL,
    accept: eightOffPlacementRule(EightOffRole.CELL),
  }),
  ...foundationRow({
    count: FOUNDATION_COUNT,
    column: CELL_COUNT,
    row: 0,
    role: EightOffRole.FOUNDATION,
    accept: eightOffPlacementRule(EightOffRole.FOUNDATION),
  }),
  ...columnRow({
    count: TABLEAU_COUNT,
    column: TABLEAU_COLUMN_OFFSET,
    row: 1,
    role: EightOffRole.TABLEAU,
    accept: eightOffPlacementRule(EightOffRole.TABLEAU),
    grab: { kind: "run", adjacent: isSameSuitRun },
    layout: OPEN_COLUMN_LAYOUT,
    face: "always-up",
  }),
];

/** Re-exported: the roles live with the rules that branch on them. */
export { EightOffRole };
