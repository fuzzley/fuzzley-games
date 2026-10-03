import { ZoneSpec } from "@/engine/tableau/zone";
import { zoneAt } from "@/engine/tableau/zone_builder";
import { DISCARD_PILE_ID, STOCK_PILE_ID } from "../common/pile_ids";
import { STACKED_PILE_LAYOUT } from "../common/pile_layouts";
import {
  FOUNDATION_PLACEHOLDER,
  PLAIN_PLACEHOLDER,
  RECYCLING_STOCK_PLACEHOLDER,
  stockZone,
} from "../common/zone_presets";
import {
  MonteCarloRole,
  MonteCarloVariant,
  monteCarloCellRule,
  monteCarloDiscardRule,
} from "./monte_carlo_rules";

/** How many cells each side of the square grid has. */
export const GRID_SIZE = 5;

/** The grid column the grid's first column sits in, right of the stock. */
export const GRID_COLUMN_OFFSET = 1;

/** How many grid columns the board is wide: stock, grid, then discard. */
export const BOARD_COLUMN_COUNT = GRID_SIZE + 2;

/** Returns the stable id of the cell at the given row and column. */
export function cellPileId(row: number, column: number): string {
  return `cell-${row}-${column}`;
}

export { DISCARD_PILE_ID, STOCK_PILE_ID };

/** Returns the ids of the up to eight cells touching a cell, corners included. */
export function neighbourIds(row: number, column: number): Set<string> {
  const ids = new Set<string>();
  for (let dRow = -1; dRow <= 1; dRow++) {
    for (let dColumn = -1; dColumn <= 1; dColumn++) {
      const r = row + dRow;
      const c = column + dColumn;
      if (
        (dRow !== 0 || dColumn !== 0) &&
        r >= 0 &&
        r < GRID_SIZE &&
        c >= 0 &&
        c < GRID_SIZE
      ) {
        ids.add(cellPileId(r, c));
      }
    }
  }
  return ids;
}

/**
 * Returns the zones of a board under a variant: the stock, the grid row by
 * row, then the discard.
 *
 * Built cell by cell because each cell's rule closes over its neighbours, and
 * with no `capacity`: a pair is made by dropping a card on its partner, which
 * the cell has to take before the move discards both.
 */
export function monteCarloZoneSpecs(
  variant: MonteCarloVariant,
): readonly ZoneSpec[] {
  const zones: ZoneSpec[] = [
    stockZone({
      id: STOCK_PILE_ID,
      role: MonteCarloRole.STOCK,
      column: 0,
      row: 0,
      accept: null,
      // How it starts out; the game redraws it as consolidating comes and goes.
      backgroundKey: RECYCLING_STOCK_PLACEHOLDER,
      // Once the stock is out, its slot still consolidates the grid.
      emptyIsActionable: true,
    }),
  ];

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let column = 0; column < GRID_SIZE; column++) {
      zones.push(
        zoneAt({
          id: cellPileId(row, column),
          role: MonteCarloRole.CELL,
          column: GRID_COLUMN_OFFSET + column,
          row,
          accept: monteCarloCellRule(variant, neighbourIds(row, column)),
          layout: STACKED_PILE_LAYOUT,
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
      id: DISCARD_PILE_ID,
      role: MonteCarloRole.DISCARD,
      column: GRID_COLUMN_OFFSET + GRID_SIZE,
      row: 0,
      accept: monteCarloDiscardRule(variant),
      layout: STACKED_PILE_LAYOUT,
      grab: { kind: "none" },
      draggable: false,
      face: "always-up",
      // Circled, as a foundation is: emptying the board into it wins.
      backgroundKey: FOUNDATION_PLACEHOLDER,
    }),
  );

  return zones;
}

/** Re-exported: the roles and variants live with the rules that shape them. */
export { MonteCarloRole, MonteCarloVariant };
