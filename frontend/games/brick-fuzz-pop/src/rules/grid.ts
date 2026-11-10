// The field's grid: its cells, the box a brick stands in, how a brick meets
// a fuzzball, and which cells stop one, for @fz/core/sweep to find which of
// a brick's faces and corners a fuzzball can touch.
//
// The field's y grows up from its floor, and @fz/core/sweep names a box's
// edges and faces for a y that grows down a screen. So its top is this
// field's floorward edge, the one of least y, and its bottom the
// ceilingward one: a brick's face toward the floor is SIDE.top (FLOORWARD),
// its face toward the ceiling SIDE.bottom (CEILINGWARD), and SIDE.left and
// SIDE.right keep their names. This is the one place the field says so.

import { recordOf } from "@fz/core/records";
import { type Box, SIDE, type Solid } from "@fz/core/sweep";
import {
  BRICK_KINDS,
  BRICK_KIND_IDS,
  type BrickKind,
  type BrickKindId,
  type BrickKinds,
} from "./catalog/bricks";
import { COLUMNS } from "./tuning";
import type { Brick, Wall } from "./wall/wall";

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

/** One of a brick's corners in this field, as `@fz/core/sweep`'s `SIDE` bit. */
export type FieldCorner =
  | typeof FLOORWARD_LEFT
  | typeof FLOORWARD_RIGHT
  | typeof CEILINGWARD_LEFT
  | typeof CEILINGWARD_RIGHT;

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

/** Returns the field row a wall cell stands in. */
export function fieldRowOf(wall: Wall, cell: number): number {
  return wall.lowestRow + wallRowOf(cell);
}

/**
 * Returns the wall cell that stands in a field cell, whose column lies
 * between the side walls: a row under the wall or over it gives a cell off
 * the wall, but a column beyond a side wall names a cell of the row beside.
 */
export function cellAt(wall: Wall, column: number, row: number): number {
  return cellOf(column, row - wall.lowestRow);
}

/**
 * Returns the brick in play in a field cell, or null: none stands in a cell
 * beyond a side wall, over the ceiling, where a row of the wall waits out of
 * play, or under the floor.
 */
export function brickAt(
  wall: Wall,
  depth: number,
  column: number,
  row: number,
): Brick | null {
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

/**
 * Names how a brick meets a fuzzball: as the box of its cell, as a disc at
 * the cell's middle, as a bumper does, or not at all, as a portal, which a
 * fuzzball flies into.
 */
export type BrickShape = "box" | "round" | "open";

/** Returns how a kind of brick meets a fuzzball. */
export function shapeOf(kind: BrickKind): BrickShape {
  if (!kind.solid) {
    return "open";
  }
  return kind.traits.some((trait) => trait.kind === "kicks") ? "round" : "box";
}

/** Each kind of brick's shape, by its id. */
export type Shapes = Readonly<Record<BrickKindId, BrickShape>>;

/** Returns the shape of each kind of brick. */
export function shapesOf(kinds: BrickKinds): Shapes {
  return recordOf(BRICK_KIND_IDS, (id) => shapeOf(kinds[id]));
}

/** The shapes of the catalog's kinds. */
export const SHAPES: Shapes = shapesOf(BRICK_KINDS);

/**
 * Returns which cells of a field of a depth hold a box a fuzzball turns off,
 * its kinds of brick of the shapes given, as `@fz/core/sweep`'s
 * `exposureOf()` reads them.
 *
 * A cell beyond a side wall does, as the wall does, so a brick against one
 * shows it no face or corner; a cell of the field does where a brick in play
 * meets a fuzzball as a box, which a bumper, though solid, and a portal
 * don't; and a waiting row's cell, over the ceiling, never does, so a brick
 * under one shows its face to the ceiling.
 *
 * It reads the wall each time it is asked, so a flight that empties the
 * cells of the wall it handed in as their bricks break is answered for the
 * wall as it stands.
 */
export function boxesIn(wall: Wall, depth: number, shapes: Shapes): Solid {
  return (column, row) => {
    if (column < 0 || column >= COLUMNS) {
      return true;
    }
    const brick = brickAt(wall, depth, column, row);
    return brick !== null && shapes[brick.kind] === "box";
  };
}
