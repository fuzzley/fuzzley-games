import { lerp } from "@fz/core/math";
import type { Box, Solid } from "@fz/core/sweep";
import { BRICKS_TOP, BRICK_HEIGHT, BRICK_WIDTH, COLUMNS, ROWS } from "./tuning";

/** How many cells the grid has. */
export const CELLS = COLUMNS * ROWS;

/** How far apart a line of sight across the grid is looked along, in field units. */
const SIGHT_STEP = 0.25;

/** Returns a cell's index in the grid, row by row from the top left. */
export function cellIndex(column: number, row: number): number {
  return row * COLUMNS + column;
}

/** Returns whether a column and a row name a cell of the grid. */
export function inGrid(column: number, row: number): boolean {
  return column >= 0 && column < COLUMNS && row >= 0 && row < ROWS;
}

/** Returns a cell's column, from its index. */
export function columnOf(index: number): number {
  return index % COLUMNS;
}

/** Returns a cell's row, from its index. */
export function rowOf(index: number): number {
  return Math.floor(index / COLUMNS);
}

/** Returns the column a point lies in, which may be off the grid. */
export function columnAt(x: number): number {
  return Math.floor(x / BRICK_WIDTH);
}

/** Returns the row a point lies in, which may be off the grid. */
export function rowAt(y: number): number {
  return Math.floor((y - BRICKS_TOP) / BRICK_HEIGHT);
}

/** Returns where a column's middle is, across. */
export function columnMiddle(column: number): number {
  return (column + 0.5) * BRICK_WIDTH;
}

/** Returns where a row's middle is, down. */
export function rowMiddle(row: number): number {
  return BRICKS_TOP + (row + 0.5) * BRICK_HEIGHT;
}

/** Returns where a cell's middle is, across. */
export function cellMiddleX(cell: number): number {
  return columnMiddle(columnOf(cell));
}

/** Returns where a cell's middle is, down. */
export function cellMiddleY(cell: number): number {
  return rowMiddle(rowOf(cell));
}

/**
 * Returns whether a straight line from a place to a cell's middle crosses no
 * other cell that stops a ball, as `solid` says.
 *
 * It follows the line alone, not a ball's width about it.
 */
export function inSight(
  solid: Solid,
  x: number,
  y: number,
  cell: number,
): boolean {
  const toX = cellMiddleX(cell);
  const toY = cellMiddleY(cell);
  const length = Math.hypot(toX - x, toY - y);
  for (let along = 0; along < length; along += SIGHT_STEP) {
    const t = along / length;
    const column = columnAt(lerp(x, toX, t));
    const row = rowAt(lerp(y, toY, t));
    if (cellIndex(column, row) !== cell && solid(column, row)) return false;
  }
  return true;
}

/**
 * Writes the box of the brick in a cell into `box`, and returns it.
 *
 * It is the only place a brick's box is worked out.
 */
export function brickBox(column: number, row: number, box: Box): Box {
  box.left = column * BRICK_WIDTH;
  box.top = BRICKS_TOP + row * BRICK_HEIGHT;
  box.right = box.left + BRICK_WIDTH;
  box.bottom = box.top + BRICK_HEIGHT;
  return box;
}
