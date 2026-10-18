import { ZoneSpec } from "@/engine/tableau/zones/zone";
import { zoneAt } from "@/engine/tableau/zones/zone_builder";
import { STOCK_PILE_ID, WASTE_PILE_ID } from "../common/pile_ids";
import { STACKED_PILE_LAYOUT } from "../common/pile_layouts";
import {
  CLOSED_STOCK_PLACEHOLDER,
  FOUNDATION_PLACEHOLDER,
  stockZone,
} from "../common/zone_presets";
import { TRI_PEAKS_WASTE_RULE, TriPeaksRole } from "./tri_peaks_rules";

/** How many grid columns the board is wide: the base row of ten. */
export const BOARD_COLUMN_COUNT = 10;

/** How far each row of the peaks sits below the one above, in grid rows. */
export const ROW_STEP = 0.5;

/** The grid row the stock and waste sit in, a row below the peaks' base. */
export const STOCK_ROW = 3 * ROW_STEP + 1;

/** How many grid rows the board is tall. */
export const BOARD_ROW_COUNT = STOCK_ROW + 1;

export { STOCK_PILE_ID, WASTE_PILE_ID };

/** Describes one place in the peaks. */
export interface PeakPlace {
  /** Its row, from the peaks' tips down to the base. */
  readonly row: number;
  /** Its index within the row, from the left. */
  readonly index: number;
  /** The grid column it sits in. */
  readonly column: number;
  /** The ids of the places lying over it, none on the base. */
  readonly coveredBy: readonly string[];
}

/** Returns the stable id of the place at a row and index. */
export function peakPileId(row: number, index: number): string {
  return `peak-${row}-${index}`;
}

/** The columns of each row: three tips, six, nine, and the base of ten. */
const ROW_COLUMNS: readonly (readonly number[])[] = [
  [1.5, 4.5, 7.5],
  [1, 2, 4, 5, 7, 8],
  [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5],
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
];

/**
 * Every place in the three peaks, row by row from the tips: a card is covered
 * by the cards in the next row half a column either side of it.
 */
export const PEAK_PLACES: readonly PeakPlace[] = ROW_COLUMNS.flatMap(
  (columns, row) =>
    columns.map((column, index) => ({
      row,
      index,
      column,
      coveredBy: (ROW_COLUMNS[row + 1] ?? []).flatMap((below, belowIndex) =>
        Math.abs(below - column) === 0.5
          ? [peakPileId(row + 1, belowIndex)]
          : [],
      ),
    })),
);

/** How many rows of the peaks are dealt face down: all but the base. */
export const BURIED_ROWS = ROW_COLUMNS.length - 1;

/**
 * Returns the zones of a TriPeaks board: the peaks, row by row from the
 * tips, then the stock and waste centred beneath.
 *
 * The rows are declared from the top down, so each half covers the one above.
 */
export function triPeaksZoneSpecs(): readonly ZoneSpec[] {
  return ZONES;
}

const ZONES: readonly ZoneSpec[] = [
  ...PEAK_PLACES.map(({ row, index, column, coveredBy }) =>
    zoneAt({
      id: peakPileId(row, index),
      role: TriPeaksRole.PEAK,
      column,
      row: row * ROW_STEP,
      // Cards only leave the peaks.
      accept: null,
      layout: STACKED_PILE_LAYOUT,
      grab: { kind: "uncovered", coveredBy },
      draggable: true,
      face: "card",
    }),
  ),
  stockZone({
    id: STOCK_PILE_ID,
    role: TriPeaksRole.STOCK,
    column: BOARD_COLUMN_COUNT / 2 - 1.5,
    row: STOCK_ROW,
    accept: null,
    // No `emptyIsActionable`: the stock is turned only once.
    backgroundKey: CLOSED_STOCK_PLACEHOLDER,
  }),
  zoneAt({
    id: WASTE_PILE_ID,
    role: TriPeaksRole.WASTE,
    column: BOARD_COLUMN_COUNT / 2 + 0.5,
    row: STOCK_ROW,
    accept: TRI_PEAKS_WASTE_RULE,
    layout: STACKED_PILE_LAYOUT,
    grab: { kind: "none" },
    draggable: false,
    face: "always-up",
    backgroundKey: FOUNDATION_PLACEHOLDER,
  }),
];

/** Re-exported: the roles live with the rules that use them. */
export { TriPeaksRole };
