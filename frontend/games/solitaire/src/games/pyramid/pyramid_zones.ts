import { ZoneSpec } from "@/engine/tableau/zone";
import { zoneAt } from "@/engine/tableau/zone_builder";
import {
  DISCARD_PILE_ID,
  HAND_PILE_ID,
  STOCK_PILE_ID,
  WASTE_PILE_ID,
} from "../common/pile_ids";
import { STACKED_PILE_LAYOUT } from "../common/pile_layouts";
import {
  CLOSED_STOCK_PLACEHOLDER,
  FOUNDATION_PLACEHOLDER,
  PLAIN_PLACEHOLDER,
  recyclePipsPlaceholder,
  stockZone,
} from "../common/zone_presets";
import {
  LONE_KING_RULE,
  OPEN_PAIR_RULE,
  PyramidPasses,
  PyramidRole,
  pyramidPairRule,
} from "./pyramid_rules";

/** How many rows the pyramid has. */
export const PYRAMID_ROWS = 7;

/** How many grid columns the board is wide: the pyramid's base. */
export const BOARD_COLUMN_COUNT = PYRAMID_ROWS;

/** How far each row of the pyramid sits below the one above, in grid rows. */
export const ROW_STEP = 0.5;

/** How many grid rows the board is tall: down to the pyramid's base. */
export const BOARD_ROW_COUNT = (PYRAMID_ROWS - 1) * ROW_STEP + 1;

export { DISCARD_PILE_ID, HAND_PILE_ID, STOCK_PILE_ID, WASTE_PILE_ID };

/** Returns the stable id of the place at the given row and index in the row. */
export function pyramidPileId(row: number, index: number): string {
  return `pyramid-${row}-${index}`;
}

/** Returns the ids of the two places lying over a place, or none on the base. */
export function coveringPileIds(row: number, index: number): string[] {
  return row + 1 < PYRAMID_ROWS
    ? [pyramidPileId(row + 1, index), pyramidPileId(row + 1, index + 1)]
    : [];
}

/**
 * Returns the zones of a Pyramid board: the stock and hand at the top left,
 * the waste and discard at the top right, and the pyramid, row by row, in
 * between and below.
 *
 * The rows are declared from the top down, so each half-covers the one above,
 * and sit half a row apart, each centred under the last.
 */
export function pyramidZoneSpecs(passes: PyramidPasses): readonly ZoneSpec[] {
  const zones: ZoneSpec[] = [
    stockZone({
      id: STOCK_PILE_ID,
      role: PyramidRole.STOCK,
      column: 0,
      row: 0,
      accept: null,
      backgroundKey:
        passes > 1
          ? recyclePipsPlaceholder(passes - 1, passes - 1)
          : CLOSED_STOCK_PLACEHOLDER,
      emptyIsActionable: passes > 1,
    }),
    zoneAt({
      id: HAND_PILE_ID,
      role: PyramidRole.HAND,
      column: 1,
      row: 0,
      accept: OPEN_PAIR_RULE,
      layout: STACKED_PILE_LAYOUT,
      grab: { kind: "top-only" },
      draggable: true,
      face: "always-up",
      backgroundKey: PLAIN_PLACEHOLDER,
    }),
    zoneAt({
      id: WASTE_PILE_ID,
      role: PyramidRole.WASTE,
      column: PYRAMID_ROWS - 2,
      row: 0,
      accept: OPEN_PAIR_RULE,
      layout: STACKED_PILE_LAYOUT,
      grab: { kind: "top-only" },
      draggable: true,
      face: "always-up",
      backgroundKey: PLAIN_PLACEHOLDER,
    }),
    zoneAt({
      id: DISCARD_PILE_ID,
      role: PyramidRole.DISCARD,
      column: PYRAMID_ROWS - 1,
      row: 0,
      accept: LONE_KING_RULE,
      layout: STACKED_PILE_LAYOUT,
      grab: { kind: "none" },
      draggable: false,
      face: "always-up",
      backgroundKey: FOUNDATION_PLACEHOLDER,
    }),
  ];

  for (let row = 0; row < PYRAMID_ROWS; row++) {
    for (let index = 0; index <= row; index++) {
      const coveredBy = coveringPileIds(row, index);
      zones.push(
        zoneAt({
          id: pyramidPileId(row, index),
          role: PyramidRole.PYRAMID,
          column: (PYRAMID_ROWS - 1 - row) / 2 + index,
          row: row * ROW_STEP,
          // No capacity: a pair is made by dropping a card on its partner.
          accept: pyramidPairRule(coveredBy),
          layout: STACKED_PILE_LAYOUT,
          grab: { kind: "uncovered", coveredBy },
          draggable: true,
          face: "always-up",
          // Over bare table, so a cleared place leaves the pyramid's shape.
        }),
      );
    }
  }

  return zones;
}

/** Re-exported: the roles live with the rules that branch on them. */
export { PyramidRole };
