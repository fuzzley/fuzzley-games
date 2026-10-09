import { ArrangedLayouts } from "@/engine/render/layout/board_layouts";
import {
  SlotPlacement,
  tableLayout,
} from "@/engine/render/layout/table_layout";
import { boardLayout } from "../common/board_layout";
import { phoneLayout } from "../common/arranged_layouts";
import { MonteCarloVariant } from "./monte_carlo_rules";
import {
  BOARD_COLUMN_COUNT,
  DISCARD_PILE_ID,
  GRID_COLUMN_OFFSET,
  GRID_SIZE,
  STOCK_PILE_ID,
  cellPileId,
  monteCarloZoneSpecs,
} from "./monte_carlo_zones";

/**
 * The board Monte Carlo and Thirteens share: the stock at the left of the
 * five-by-five grid and the discard at its right.
 *
 * Either variant would do for reading the zones: it changes the rules, not
 * the grid. Nothing fans, so the board needs no `designHeightPx`.
 */
export const MONTE_CARLO_LAYOUT = boardLayout({
  columns: BOARD_COLUMN_COUNT,
  rows: GRID_SIZE,
  zones: monteCarloZoneSpecs(MonteCarloVariant.MONTE_CARLO),
});

/** The grid's cells, row by row. */
const CELLS = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) =>
  cellPileId(Math.floor(index / GRID_SIZE), index % GRID_SIZE),
);

/** Places the grid with its top-left cell at a grid cell. */
function gridFrom(column: number, row: number): SlotPlacement[] {
  return CELLS.map((pileId, index) => ({
    pileId,
    column: column + (index % GRID_SIZE),
    row: row + Math.floor(index / GRID_SIZE),
  }));
}

/** Places the stock and the discard at either side of the grid, in a row. */
function besideGrid(row: number): SlotPlacement[] {
  return [
    { pileId: STOCK_PILE_ID, column: 0, row },
    { pileId: DISCARD_PILE_ID, column: BOARD_COLUMN_COUNT - 1, row },
  ];
}

/**
 * Places the stock and the discard at either end of a row above or below the
 * grid.
 */
function inARow(
  row: number,
  anchor: "top" | "bottom" = "top",
): SlotPlacement[] {
  return [
    { pileId: STOCK_PILE_ID, column: 0, row, anchor },
    { pileId: DISCARD_PILE_ID, column: GRID_SIZE - 1, row, anchor },
  ];
}

/**
 * The Monte Carlo board in every arrangement. On a larger screen and a
 * sideways phone the stock and the discard stand at either side of the grid,
 * beside its first row or its last; an upright phone puts them at either end
 * of a row above the grid or along the bottom edge, so the grid is five cards
 * wide rather than seven. The stock goes on whichever side the player asks
 * for, and the grid keeps its order.
 */
export const MONTE_CARLO_ARRANGED_LAYOUTS: ArrangedLayouts = {
  roomy: {
    top: MONTE_CARLO_LAYOUT,
    bottom: tableLayout({
      columns: BOARD_COLUMN_COUNT,
      rows: GRID_SIZE,
      slots: [...besideGrid(GRID_SIZE - 1), ...gridFrom(GRID_COLUMN_OFFSET, 0)],
    }),
  },
  portrait: {
    top: phoneLayout({
      columns: GRID_SIZE,
      rows: GRID_SIZE + 1,
      slots: [...inARow(0), ...gridFrom(0, 1)],
    }),
    bottom: phoneLayout({
      columns: GRID_SIZE,
      rows: GRID_SIZE + 1,
      slots: [...gridFrom(0, 0), ...inARow(0, "bottom")],
    }),
  },
  landscape: {
    top: phoneLayout({
      columns: BOARD_COLUMN_COUNT,
      rows: GRID_SIZE,
      slots: [...besideGrid(0), ...gridFrom(GRID_COLUMN_OFFSET, 0)],
    }),
    bottom: phoneLayout({
      columns: BOARD_COLUMN_COUNT,
      rows: GRID_SIZE,
      slots: [...besideGrid(GRID_SIZE - 1), ...gridFrom(GRID_COLUMN_OFFSET, 0)],
    }),
  },
  columns: CELLS,
  side: STOCK_PILE_ID,
};
