import { ZoneSpec } from "@/engine/tableau/zone";
import { zoneAt } from "@/engine/tableau/zone_builder";
import { STACKED_PILE_LAYOUT } from "../common/pile_layouts";
import { PLAIN_PLACEHOLDER } from "../common/zone_presets";
import {
  COLUMN_COUNT,
  MontanaRole,
  ROW_COUNT,
  montanaCellRule,
} from "./montana_rules";

/** The stable id of the redeal marker. */
export const REDEAL_PILE_ID = "redeal";

/**
 * The redeal marker's artwork while it can redeal, indexed by how many
 * redeals are spent: a recycle arrow with a pip per redeal, filled for each
 * one left.
 */
export const REDEAL_MARKER_PLACEHOLDERS = [
  "card-placeholder-full-border-reset-2-of-2",
  "card-placeholder-full-border-reset-1-of-2",
] as const;

/**
 * How many grid columns the board is wide: the thirteen of the grid plus one
 * for the redeal marker beside it.
 */
export const BOARD_COLUMN_COUNT = COLUMN_COUNT + 1;

/** Returns the stable id of the cell at the given row and column. */
export function cellPileId(row: number, column: number): string {
  return `cell-${row}-${column}`;
}

/**
 * Returns the fifty-three zones of a Montana board.
 *
 * Built cell by cell because each cell's rule depends on its left neighbour.
 */
export function montanaZoneSpecs(): readonly ZoneSpec[] {
  return ZONES;
}

const ZONES: readonly ZoneSpec[] = buildZoneSpecs();

function buildZoneSpecs(): readonly ZoneSpec[] {
  const zones: ZoneSpec[] = [];

  for (let row = 0; row < ROW_COUNT; row++) {
    for (let column = 0; column < COLUMN_COUNT; column++) {
      zones.push(
        zoneAt({
          id: cellPileId(row, column),
          role: MontanaRole.CELL,
          column,
          row,
          layout: STACKED_PILE_LAYOUT,
          capacity: 1,
          // The neighbour is captured here, where both cells are in hand,
          // rather than parsed out of an id at rule time.
          accept: montanaCellRule(
            column === 0 ? null : cellPileId(row, column - 1),
          ),
          grab: { kind: "top-only" },
          draggable: true,
          face: "always-up",
          backgroundKey: PLAIN_PLACEHOLDER,
        }),
      );
    }
  }

  zones.push(
    zoneAt({
      id: REDEAL_PILE_ID,
      role: MontanaRole.REDEAL,
      // Beside the grid rather than in it, on the row a player's eye starts at.
      column: COLUMN_COUNT,
      row: 0,
      layout: STACKED_PILE_LAYOUT,
      // Never a destination and never a source: it is a button that happens to
      // be drawn on the table.
      accept: null,
      grab: { kind: "none" },
      draggable: false,
      face: "always-down",
      // How it starts out; the game redraws it as redeals are spent.
      backgroundKey: REDEAL_MARKER_PLACEHOLDERS[0],
      // Pressing the empty slot is the whole point of it.
      emptyIsActionable: true,
    }),
  );

  return zones;
}

/** Re-exported: the roles live with the rules that branch on them. */
export { MontanaRole };
