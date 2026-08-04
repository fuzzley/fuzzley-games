import { isSameSuitRun } from "@/engine/tableau/rules";
import { ZoneSpec } from "@/engine/tableau/zone";
import { OPEN_COLUMN_LAYOUT } from "../common/pile_layouts";
import { cellRow, columnRow, foundationRow } from "../common/zone_presets";
import { EightOffRole, eightOffPlacementRule } from "./eight_off_rules";

/** The number of free cells. Eight of them, which is where the name comes from. */
export const CELL_COUNT = 8;

/** The number of suit foundation piles. */
export const FOUNDATION_COUNT = 4;

/** The number of tableau columns. */
export const TABLEAU_COUNT = 8;

/**
 * How many grid columns the board is wide.
 *
 * The top row is the binding one: eight cells and four foundations have to sit
 * side by side, so the board is twelve wide even though only eight columns hang
 * beneath it. See the layout for why that is the right trade.
 */
export const BOARD_COLUMN_COUNT = CELL_COUNT + FOUNDATION_COUNT;

/**
 * The grid column the leftmost tableau starts in.
 *
 * Derived rather than written as `2`, so it stays centred if the counts above
 * ever change. `SlotPlacement.column` is a free integer and the board centres
 * itself as a whole, so an indented row costs the engine nothing.
 */
export const TABLEAU_COLUMN_OFFSET = Math.floor(
  (BOARD_COLUMN_COUNT - TABLEAU_COUNT) / 2,
);

/**
 * The twenty zones of an Eight Off board.
 *
 * Eight cells at the left of the top row, four foundations at the right of it,
 * and the eight columns centred beneath. Twice FreeCell's cells and a
 * one-suit build make it a far gentler game than its ancestor, which is the
 * only interesting thing about it as a variant — and none of that is code here,
 * it is the numbers above and the rules the zones point at.
 */
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
    // A run here is one suit, not merely one colour, which is the same question
    // the build rule asks — so both derive from `isSameSuitRun` and cannot
    // drift apart.
    grab: { kind: "run", adjacent: isSameSuitRun },
    // Every card is dealt face up, so nothing is ever turned over and the game
    // has no hidden information at all.
    layout: OPEN_COLUMN_LAYOUT,
    face: "always-up",
  }),
];

/** Re-exported: the roles live with the rules that branch on them. */
export { EightOffRole };
