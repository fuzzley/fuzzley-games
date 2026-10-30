import { BRICKS_TOP, BRICK_HEIGHT, BRICK_WIDTH, COLUMNS, ROWS } from "./tuning";

/** Describes a box in the field: its edges, in field units. */
export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * Says whether a cell stops a ball: a brick in it that the ball can't pass
 * through.
 *
 * Columns beside the grid, where the walls stand, do, and rows above and
 * below it don't, so a field checks a cell with {@link inGrid} before it
 * looks in its bricks, where column -1 would be the last of the row above.
 */
export type Solid = (column: number, row: number) => boolean;

/** How many cells the grid has. */
export const CELLS = COLUMNS * ROWS;

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

/** A brick's faces and corners, each a bit of an exposure. */
export const SIDE = {
  top: 1,
  right: 2,
  bottom: 4,
  left: 8,
  topLeft: 16,
  topRight: 32,
  bottomRight: 64,
  bottomLeft: 128,
} as const;

/** Every face and corner of a box, as an exposure. */
export const ALL_SIDES = Object.values(SIDE).reduce(
  (all: number, side) => all | side,
  0,
);

/** One of a box's faces, as {@link SIDE} names it. */
export type Face = (typeof SIDE)["top" | "right" | "bottom" | "left"];

/** One of a box's corners, as {@link SIDE} names it. */
export type Corner = (typeof SIDE)[
  "topLeft" | "topRight" | "bottomRight" | "bottomLeft"];

/** A box's faces, clockwise from the top. */
export const FACES: readonly Face[] = [
  SIDE.top,
  SIDE.right,
  SIDE.bottom,
  SIDE.left,
];

/** A box's corners, clockwise from the top left. */
export const CORNERS: readonly Corner[] = [
  SIDE.topLeft,
  SIDE.topRight,
  SIDE.bottomRight,
  SIDE.bottomLeft,
];

/** Each face's normal, the way out of the box, across and down. */
export const FACE_NORMAL: Readonly<
  Record<Face, { readonly x: -1 | 0 | 1; readonly y: -1 | 0 | 1 }>
> = {
  [SIDE.top]: { x: 0, y: -1 },
  [SIDE.right]: { x: 1, y: 0 },
  [SIDE.bottom]: { x: 0, y: 1 },
  [SIDE.left]: { x: -1, y: 0 },
};

/** Each corner's place, as the edges of a box it lies on. */
export const CORNER_AT: Readonly<
  Record<Corner, { readonly x: "left" | "right"; readonly y: "top" | "bottom" }>
> = {
  [SIDE.topLeft]: { x: "left", y: "top" },
  [SIDE.topRight]: { x: "right", y: "top" },
  [SIDE.bottomRight]: { x: "right", y: "bottom" },
  [SIDE.bottomLeft]: { x: "left", y: "bottom" },
};

/**
 * Returns which faces and corners of the brick in a cell a ball can touch,
 * as {@link SIDE}'s bits.
 *
 * A face is exposed where the cell beside it is open, so bricks side by side
 * make one flat face. A corner is exposed where both cells beside it and the
 * one across from it are open, so a corner is only where nothing touches it.
 */
export function exposureOf(solid: Solid, column: number, row: number): number {
  const up = !solid(column, row - 1);
  const down = !solid(column, row + 1);
  const left = !solid(column - 1, row);
  const right = !solid(column + 1, row);
  let sides = 0;
  if (up) sides |= SIDE.top;
  if (right) sides |= SIDE.right;
  if (down) sides |= SIDE.bottom;
  if (left) sides |= SIDE.left;
  if (up && left && !solid(column - 1, row - 1)) sides |= SIDE.topLeft;
  if (up && right && !solid(column + 1, row - 1)) sides |= SIDE.topRight;
  if (down && right && !solid(column + 1, row + 1)) sides |= SIDE.bottomRight;
  if (down && left && !solid(column - 1, row + 1)) sides |= SIDE.bottomLeft;
  return sides;
}
