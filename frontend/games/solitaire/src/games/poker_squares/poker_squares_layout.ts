import { ArrangedLayouts } from "@/engine/render/layout/board_layouts";
import {
  SlotPlacement,
  tableLayout,
} from "@/engine/render/layout/table_layout";
import { boardLayout } from "../common/board_layout";
import { phoneLayout } from "../common/arranged_layouts";
import {
  BOARD_COLUMN_COUNT,
  GRID_COLUMN_OFFSET,
  GRID_SIZE,
  HAND_PILE_ID,
  STOCK_PILE_ID,
  pokerSquaresZoneSpecs,
  squarePileId,
} from "./poker_squares_zones";

/**
 * The Poker Squares board: the stock and the card to place at the left, and
 * the five-by-five grid beside them.
 *
 * Nothing fans, so the board needs no `designHeightPx`.
 */
export const POKER_SQUARES_LAYOUT = boardLayout({
  columns: BOARD_COLUMN_COUNT,
  rows: GRID_SIZE,
  zones: pokerSquaresZoneSpecs(),
});

/** The squares, row by row. */
const SQUARES = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) =>
  squarePileId(Math.floor(index / GRID_SIZE), index % GRID_SIZE),
);

/** Places the grid of squares with its top-left square at a grid cell. */
function squaresFrom(column: number, row: number): SlotPlacement[] {
  return SQUARES.map((pileId, index) => ({
    pileId,
    column: column + (index % GRID_SIZE),
    row: row + Math.floor(index / GRID_SIZE),
  }));
}

/** Places the stock above the card to place, at the left of the grid. */
function besideGrid(firstRow: number): SlotPlacement[] {
  return [
    { pileId: STOCK_PILE_ID, column: 0, row: firstRow },
    { pileId: HAND_PILE_ID, column: 0, row: firstRow + 1 },
  ];
}

/**
 * Places the stock and the card to place side by side in one row, with the
 * grid of squares in the rows around it.
 */
function inARow(
  row: number,
  anchor: "top" | "bottom" = "top",
): SlotPlacement[] {
  return [
    { pileId: STOCK_PILE_ID, column: 0, row, anchor },
    { pileId: HAND_PILE_ID, column: 1, row, anchor },
  ];
}

/**
 * The Poker Squares board in every arrangement. On a larger screen and a
 * sideways phone the stock and the card to place stand beside the grid, at
 * its top or its bottom; an upright phone puts them in a row above the grid or
 * along the bottom edge, so the grid is five cards wide rather than six. They
 * go on whichever side the player asks for, and the grid keeps its order.
 */
export const POKER_SQUARES_ARRANGED_LAYOUTS: ArrangedLayouts = {
  roomy: {
    top: POKER_SQUARES_LAYOUT,
    bottom: tableLayout({
      columns: BOARD_COLUMN_COUNT,
      rows: GRID_SIZE,
      slots: [
        ...besideGrid(GRID_SIZE - 2),
        ...squaresFrom(GRID_COLUMN_OFFSET, 0),
      ],
    }),
  },
  portrait: {
    top: phoneLayout({
      columns: GRID_SIZE,
      rows: GRID_SIZE + 1,
      slots: [...inARow(0), ...squaresFrom(0, 1)],
    }),
    bottom: phoneLayout({
      columns: GRID_SIZE,
      rows: GRID_SIZE + 1,
      slots: [...squaresFrom(0, 0), ...inARow(0, "bottom")],
    }),
  },
  landscape: {
    top: phoneLayout({
      columns: BOARD_COLUMN_COUNT,
      rows: GRID_SIZE,
      slots: [...besideGrid(0), ...squaresFrom(GRID_COLUMN_OFFSET, 0)],
    }),
    bottom: phoneLayout({
      columns: BOARD_COLUMN_COUNT,
      rows: GRID_SIZE,
      slots: [
        ...besideGrid(GRID_SIZE - 2),
        ...squaresFrom(GRID_COLUMN_OFFSET, 0),
      ],
    }),
  },
  columns: SQUARES,
  side: STOCK_PILE_ID,
};
