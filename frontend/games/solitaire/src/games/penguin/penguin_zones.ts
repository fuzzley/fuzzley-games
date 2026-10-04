import { singleCardCell } from "@/engine/tableau/rules";
import { ZoneSpec } from "@/engine/tableau/zone";
import { OPEN_COLUMN_LAYOUT } from "../common/pile_layouts";
import { cellRow, columnRow, foundationRow } from "../common/zone_presets";
import {
  PENGUIN_FOUNDATION_RULE,
  PENGUIN_COLUMN,
  PenguinRole,
} from "./penguin_rules";

/** The number of columns. */
export const TABLEAU_COUNT = 7;

/** The number of cells in the flipper. */
export const CELL_COUNT = 7;

/** How many grid columns the board is wide: the cells, then the foundations. */
export const BOARD_COLUMN_COUNT = CELL_COUNT + 4;

/** The grid column the first column sits in, centring the columns. */
export const TABLEAU_COLUMN_OFFSET = (BOARD_COLUMN_COUNT - TABLEAU_COUNT) / 2;

/**
 * Returns the zones of a Penguin board: the flipper's seven cells and the
 * foundations along the top, and seven columns centred beneath.
 */
export function penguinZoneSpecs(): readonly ZoneSpec[] {
  return ZONES;
}

const ZONES: readonly ZoneSpec[] = [
  ...cellRow({
    count: CELL_COUNT,
    column: 0,
    row: 0,
    role: PenguinRole.CELL,
    accept: singleCardCell,
  }),
  ...foundationRow({
    count: 4,
    column: CELL_COUNT,
    row: 0,
    role: PenguinRole.FOUNDATION,
    accept: PENGUIN_FOUNDATION_RULE,
  }),
  ...columnRow({
    count: TABLEAU_COUNT,
    column: TABLEAU_COLUMN_OFFSET,
    row: 1,
    role: PenguinRole.TABLEAU,
    // However long, and however few cells are free: Penguin moves a run as a
    // unit.
    ...PENGUIN_COLUMN,
    layout: OPEN_COLUMN_LAYOUT,
    face: "always-up",
  }),
];

/** Re-exported: the roles live with the rules that use them. */
export { PenguinRole };
