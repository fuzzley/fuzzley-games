// The field's grid: its cells, numbered by wall row and column, the brick in
// play in each and the box it stands in, and the field's names for the faces
// and corners @fz/core/sweep finds a fuzzball can touch.
//
// The field's y grows up from its floor, and @fz/core/sweep names a box's
// edges and faces for a y that grows down a screen. So its top is this
// field's floorward edge, the one of least y, and its bottom the
// ceilingward one: a brick's face toward the floor is SIDE.top (FLOORWARD),
// its face toward the ceiling SIDE.bottom (CEILINGWARD), and SIDE.left and
// SIDE.right keep their names. This is the one place the field says so.

import { type Box, SIDE } from "@fz/core/sweep";
import { COLUMNS } from "./field";

/** A brick's face toward the floor: `@fz/core/sweep`'s `SIDE.top`, its edge of least y. */
export const FLOORWARD = SIDE.top;

/** A brick's face toward the ceiling: `@fz/core/sweep`'s `SIDE.bottom`. */
export const CEILINGWARD = SIDE.bottom;

/** A brick's face toward the left side wall. */
export const LEFT = SIDE.left;

/** A brick's face toward the right side wall. */
export const RIGHT = SIDE.right;

/** One of a brick's faces in this field, as `@fz/core/sweep`'s `SIDE` bit; a plate covers a set of them. */
export type FieldFace =
  typeof FLOORWARD | typeof CEILINGWARD | typeof LEFT | typeof RIGHT;

/** A brick's corner toward the floor and the left side wall: `@fz/core/sweep`'s `SIDE.topLeft`. */
export const FLOORWARD_LEFT = SIDE.topLeft;

/** A brick's corner toward the floor and the right side wall: `@fz/core/sweep`'s `SIDE.topRight`. */
export const FLOORWARD_RIGHT = SIDE.topRight;

/** A brick's corner toward the ceiling and the left side wall: `@fz/core/sweep`'s `SIDE.bottomLeft`. */
export const CEILINGWARD_LEFT = SIDE.bottomLeft;

/** A brick's corner toward the ceiling and the right side wall: `@fz/core/sweep`'s `SIDE.bottomRight`. */
export const CEILINGWARD_RIGHT = SIDE.bottomRight;

/** Returns a wall cell, by its column and its wall row: wall row × 9 + column. */
export function cellOf(column: number, wallRow: number): number {
  return wallRow * COLUMNS + column;
}

/** Returns a wall cell's column. */
export function columnOf(cell: number): number {
  return cell % COLUMNS;
}

/** Returns a wall cell's wall row, counted from the wall's lowest. */
export function wallRowOf(cell: number): number {
  return Math.floor(cell / COLUMNS);
}

/** Returns the field row a wall cell stands in, its wall row over the field row the wall's lowest stands in. */
export function fieldRowOf(
  wall: { readonly lowestRow: number },
  cell: number,
): number {
  return wall.lowestRow + wallRowOf(cell);
}

/**
 * Returns the wall cell that stands in a field cell, whose column lies
 * between the side walls: a row under the wall or over it gives a cell off
 * the wall, but a column beyond a side wall names a cell of the row beside.
 */
export function cellAt(
  wall: { readonly lowestRow: number },
  column: number,
  row: number,
): number {
  return cellOf(column, row - wall.lowestRow);
}

/**
 * Returns the brick in play in a field cell of a field of a depth, or null:
 * none stands in a cell beyond a side wall, over the ceiling, where a row of
 * the wall waits out of play, or under the floor.
 */
export function brickAt<B>(
  wall: { readonly bricks: readonly (B | null)[]; readonly lowestRow: number },
  depth: number,
  column: number,
  row: number,
): B | null {
  const cell = cellAt(wall, column, row);
  // A row under the wall's lowest or over its highest lies off its bricks,
  // and a cell under it is never looked up, as a negative index is slow.
  if (column < 0 || column >= COLUMNS || row < 0 || row >= depth || cell < 0) {
    return null;
  }
  return wall.bricks[cell] ?? null;
}

/**
 * Writes the box of a field cell into `box`, and returns it, its edges
 * named as `@fz/core/sweep` names them: its `top` is the cell's floorward
 * edge, at its row, and its `bottom` its ceilingward edge.
 */
export function brickBox(column: number, row: number, box: Box): Box {
  box.left = column;
  box.top = row;
  box.right = column + 1;
  box.bottom = row + 1;
  return box;
}
