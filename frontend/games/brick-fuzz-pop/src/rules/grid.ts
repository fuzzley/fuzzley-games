// The field's shapes: how each kind of brick meets a fuzzball, and which
// cells stop one, for @fz/core/sweep to find which of a brick's faces and
// corners a fuzzball can touch. The grid itself, its cells and its faces'
// names, is @fz/brick-wall/rules/grid's.

import { COLUMNS } from "@fz/brick-wall/rules/field";
import { brickAt } from "@fz/brick-wall/rules/grid";
import { recordOf } from "@fz/core/records";
import type { Solid } from "@fz/core/sweep";
import {
  BRICK_KINDS,
  BRICK_KIND_IDS,
  type BrickKind,
  type BrickKindId,
  type BrickKinds,
} from "./catalog/bricks";
import type { Wall } from "./wall/wall";

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
