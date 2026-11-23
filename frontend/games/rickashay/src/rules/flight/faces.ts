// What cast() meets as it flies the fuzzball's middle through the field:
// each face of the design's "The flight", a radius out from what it belongs
// to, in field units, x across from the left wall and y up from the floor.
// Every flat is a mirror and every 45° face a swap of the fuzzball's two
// speeds, so a flight keeps the eight directions its aim gave it.
//
// A brick's faces are built from the shapes of the cells about it: it shows
// a face only toward a cell that leaves that side of it open, so bricks side
// by side make one face, and a brick against a side wall or under the
// ceiling shows none toward it. Where two of its open faces meet, and
// nothing else reaches the corner between them, a 45° face cuts it, joining
// their flats' ends, so the faces close round every clump of bricks and
// leave a fuzzball's middle no way in.

import { AT_ONCE, COLUMNS, RADIUS } from "@fz/brick-wall/rules/field";
import {
  CEILINGWARD,
  CEILINGWARD_LEFT,
  CEILINGWARD_RIGHT,
  type FieldFace,
  FLOORWARD,
  FLOORWARD_LEFT,
  FLOORWARD_RIGHT,
  LEFT,
  RIGHT,
  brickAt,
  cellOf,
} from "@fz/brick-wall/rules/grid";
import type { Wall } from "../catalog/kinds";

/** Names what a face belongs to: a brick, by its wall cell, a side wall, or the ceiling. */
export type FaceOwner =
  | {
      readonly kind: "brick";
      /** Its wall cell, wall row × 9 + column, as a flight's events name a brick. */
      readonly cell: number;
    }
  | { readonly kind: "wall"; readonly side: "left" | "right" }
  | { readonly kind: "ceiling" };

/** Names the way a face looks along one of the field's two lines: toward the greater x or y (1), or the lesser (−1). */
export type Facing = 1 | -1;

/**
 * Describes a face the fuzzball's middle can meet.
 *
 * A face is met only by a fuzzball flying into it, against the way it
 * faces, so one flying away from a face, or along it, never meets it.
 */
export type Face =
  | {
      /**
       * A flat, which turns a fuzzball by changing the sign of its speed
       * across the flat: a brick's side, a side wall or the ceiling, its
       * line a radius out from theirs.
       */
      readonly kind: "flat";
      /** Whether it lies across the field, along a y, or up it, along an x. */
      readonly along: "across" | "up";
      /** Its line: the y of a flat across, the x of a flat up. */
      readonly line: number;
      /** Where along its line it starts and ends: the least and the most x of a flat across, or y of one up. */
      readonly from: number;
      readonly to: number;
      /** The way it faces, along the line it is met across: up or down for a flat across, right or left for one up. */
      readonly facing: Facing;
      readonly owner: FaceOwner;
    }
  | {
      /**
       * A 45° face, which turns a fuzzball by swapping its two speeds, with
       * the signs that send it away: a corner's cut, a ramp's long face or
       * one of a gem's four.
       */
      readonly kind: "slant";
      /** The way it faces across, right (1) or left (−1). */
      readonly facingX: Facing;
      /** The way it faces up, toward the ceiling (1) or the floor (−1). */
      readonly facingY: Facing;
      /**
       * Its line's c: x + y = c for a face that faces right and up, or left
       * and down, and x − y = c for one that faces right and down, or left
       * and up.
       */
      readonly c: number;
      /** The least and the most x it spans. */
      readonly from: number;
      readonly to: number;
      /**
       * Whether it is a long face, a ramp's or a gem's, which turns a
       * fuzzball the flats have turned if it still flies into it; a
       * corner's cut, which isn't, turns one only where nothing else did
       * at that moment (C3).
       */
      readonly long: boolean;
      readonly owner: Extract<FaceOwner, { readonly kind: "brick" }>;
    }
  | {
      /**
       * The floor, its line a radius up, from side wall to side wall,
       * which a fuzzball holding a floor bounce turns off as off a flat and
       * one holding none lands on.
       */
      readonly kind: "floor";
    }
  | {
      /**
       * A hatch's bar, a flat across the top of its cell, a radius up,
       * facing the ceiling, which a fuzzball flying up passes as air and
       * one coming down is held up by: a hold, not a strike. Its ends'
       * cuts, where nothing stands beside it, are slants its hatch owns.
       */
      readonly kind: "bar";
      /** Its line's y. */
      readonly line: number;
      /** The least and the most x it spans. */
      readonly from: number;
      readonly to: number;
      readonly owner: Extract<FaceOwner, { readonly kind: "brick" }>;
    }
  | {
      /**
       * A portal's eye, the square of `EYE` at the middle of its cell, which
       * takes a fuzzball as its middle crosses into it and sets it down at
       * the same place in its twin's eye, flying the same way.
       */
      readonly kind: "eye";
      /** Its middle, its cell's. */
      readonly x: number;
      readonly y: number;
      readonly owner: Extract<FaceOwner, { readonly kind: "brick" }>;
    };

/** A face's kind, such as "slant". */
export type FaceKind = Face["kind"];

/** A face a brick shows: any but the floor. */
export type BrickFace = Exclude<Face, { readonly kind: "floor" }>;

/** What {@link meetsAt} returns for a face a fuzzball never meets. */
export const MISSED = Number.POSITIVE_INFINITY;

/**
 * How far past its ends, and behind its line, a face is still met: a
 * hair, so a face and the one it joins meet with no gap between them,
 * however a flight's sums round, and a fuzzball a hair past a face it
 * turned off can't fly through it.
 */
export const OVERLAP = AT_ONCE;

/**
 * The shapes a field cell's brick takes, as its faces and those beside it
 * are built: none, the box of its cell, and the side walls and the
 * ceiling beyond the field, which fill every side of their cells.
 */
export const SHAPE = {
  air: 0,
  box: 1,
  beyond: 2,
} as const;

/** A field cell's shape, one of {@link SHAPE}'s. */
export type Shape = (typeof SHAPE)[keyof typeof SHAPE];

/** The sides of its cell each shape fills from end to end, as `FieldFace` bits: a brick beside it shows no face toward one it fills. */
const FILLS: Readonly<Record<Shape, number>> = {
  [SHAPE.air]: 0,
  [SHAPE.box]: FLOORWARD | CEILINGWARD | LEFT | RIGHT,
  [SHAPE.beyond]: FLOORWARD | CEILINGWARD | LEFT | RIGHT,
};

/** The corners of its cell each shape reaches, as `rules/grid`'s corner bits: no corner beside one it reaches is cut. */
const REACHES: Readonly<Record<Shape, number>> = {
  [SHAPE.air]: 0,
  [SHAPE.box]:
    FLOORWARD_LEFT | FLOORWARD_RIGHT | CEILINGWARD_LEFT | CEILINGWARD_RIGHT,
  [SHAPE.beyond]:
    FLOORWARD_LEFT | FLOORWARD_RIGHT | CEILINGWARD_LEFT | CEILINGWARD_RIGHT,
};

/** Each side of a cell's opposite: the side of the cell beside it that faces it. */
const OPPOSITE: Readonly<Record<FieldFace, FieldFace>> = {
  [FLOORWARD]: CEILINGWARD,
  [CEILINGWARD]: FLOORWARD,
  [LEFT]: RIGHT,
  [RIGHT]: LEFT,
};

/** Describes what stands in a field's cells, from which their faces are built. */
export interface FieldShapes {
  /** How many rows the field is deep. */
  readonly depth: number;
  /** The field row the wall's lowest row stands in, so a face names its brick's wall cell. */
  readonly lowestRow: number;
  /** Each field cell's shape, by field cell, row × 9 + column. */
  readonly shapes: Uint8Array;
}

/** Returns what stands in each cell of a field of a depth, from the wall's bricks in play. */
export function fieldShapes(wall: Wall, depth: number): FieldShapes {
  const shapes = new Uint8Array(COLUMNS * depth);
  for (let row = 0; row < depth; row++) {
    for (let column = 0; column < COLUMNS; column++) {
      if (brickAt(wall, depth, column, row) !== null) {
        shapes[row * COLUMNS + column] = SHAPE.box;
      }
    }
  }
  return { depth, lowestRow: wall.lowestRow, shapes };
}

/**
 * Returns the shape in a cell, which may lie off the field: beyond a side
 * wall, or over the ceiling, the field's edge fills it; under the floor
 * nothing stands.
 */
function shapeAt(
  { depth, shapes }: FieldShapes,
  column: number,
  row: number,
): Shape {
  if (column < 0 || column >= COLUMNS || row >= depth) {
    return SHAPE.beyond;
  }
  return row < 0 ? SHAPE.air : (shapes[row * COLUMNS + column] as Shape);
}

/** Returns whether a side of a field cell is open: the cell beside it leaves its side toward it unfilled. */
function isOpen(
  field: FieldShapes,
  column: number,
  row: number,
  side: FieldFace,
): boolean {
  const beside = shapeAt(
    field,
    column + (side === LEFT ? -1 : side === RIGHT ? 1 : 0),
    row + (side === FLOORWARD ? -1 : side === CEILINGWARD ? 1 : 0),
  );
  return (FILLS[beside] & OPPOSITE[side]) === 0;
}

/**
 * Returns whether a corner of a field cell, at a point where four cells
 * meet, is free: no shape in the three other cells reaches it.
 */
function isFree(
  field: FieldShapes,
  column: number,
  row: number,
  x: number,
  y: number,
): boolean {
  return !(
    reaches(field, column, row, x - 1, y - 1, CEILINGWARD_RIGHT) ||
    reaches(field, column, row, x, y - 1, CEILINGWARD_LEFT) ||
    reaches(field, column, row, x - 1, y, FLOORWARD_RIGHT) ||
    reaches(field, column, row, x, y, FLOORWARD_LEFT)
  );
}

/** Returns whether the shape in a cell, unless it is the brick's own, reaches one of that cell's corners. */
function reaches(
  field: FieldShapes,
  column: number,
  row: number,
  otherColumn: number,
  otherRow: number,
  corner: number,
): boolean {
  const other = otherColumn !== column || otherRow !== row;
  return (
    other && (REACHES[shapeAt(field, otherColumn, otherRow)] & corner) !== 0
  );
}

/** Returns a flat across the field, along the y of `line`, from x `from` to `to`. */
function across(
  line: number,
  from: number,
  to: number,
  facing: Facing,
  owner: FaceOwner,
): BrickFace {
  return { kind: "flat", along: "across", line, from, to, facing, owner };
}

/** Returns a flat up the field, along the x of `line`, from y `from` to `to`. */
function up(
  line: number,
  from: number,
  to: number,
  facing: Facing,
  owner: FaceOwner,
): BrickFace {
  return { kind: "flat", along: "up", line, from, to, facing, owner };
}

/**
 * Returns the cut across a free corner, at a point, of a brick that looks
 * out from it across and up as the signs say: a 45° face joining its two
 * flats' ends, a radius out along each.
 */
function cut(
  x: number,
  y: number,
  facingX: Facing,
  facingY: Facing,
  owner: Extract<FaceOwner, { readonly kind: "brick" }>,
): BrickFace {
  const end = x + facingX * RADIUS;
  return {
    kind: "slant",
    facingX,
    facingY,
    // The line through (x, y + facingY × RADIUS) and (end, y).
    c: x + facingX * facingY * y + facingX * RADIUS,
    from: Math.min(x, end),
    to: Math.max(x, end),
    long: false,
    owner,
  };
}

/**
 * Returns the faces the brick in a field cell shows: a flat a radius out
 * from each of its open sides, and a cut across each free corner between
 * two of them, owned by its wall cell. A cell with no brick shows none.
 */
export function brickFaces(
  field: FieldShapes,
  column: number,
  row: number,
): BrickFace[] {
  const shape = shapeAt(field, column, row);
  if (shape !== SHAPE.box) {
    return [];
  }
  const owner = {
    kind: "brick",
    cell: cellOf(column, row - field.lowestRow),
  } as const;
  const floorward = isOpen(field, column, row, FLOORWARD);
  const ceilingward = isOpen(field, column, row, CEILINGWARD);
  const left = isOpen(field, column, row, LEFT);
  const right = isOpen(field, column, row, RIGHT);
  const faces: BrickFace[] = [];
  if (floorward) {
    faces.push(across(row - RADIUS, column, column + 1, -1, owner));
  }
  if (ceilingward) {
    faces.push(across(row + 1 + RADIUS, column, column + 1, 1, owner));
  }
  if (left) {
    faces.push(up(column - RADIUS, row, row + 1, -1, owner));
  }
  if (right) {
    faces.push(up(column + 1 + RADIUS, row, row + 1, 1, owner));
  }
  for (const [x, y, facingX, facingY, open] of [
    [column, row, -1, -1, floorward && left],
    [column + 1, row, 1, -1, floorward && right],
    [column, row + 1, -1, 1, ceilingward && left],
    [column + 1, row + 1, 1, 1, ceilingward && right],
  ] as const) {
    if (open && isFree(field, column, row, x, y)) {
      faces.push(cut(x, y, facingX, facingY, owner));
    }
  }
  return faces;
}

/**
 * Returns the faces that bound a field of a depth: the side walls' and the
 * ceiling's flats, a radius in from each, and the floor.
 */
export function boundsOf(depth: number): readonly Face[] {
  return [
    up(RADIUS, 0, depth, 1, { kind: "wall", side: "left" }),
    up(COLUMNS - RADIUS, 0, depth, -1, { kind: "wall", side: "right" }),
    across(depth - RADIUS, 0, COLUMNS, -1, { kind: "ceiling" }),
    { kind: "floor" },
  ];
}

/**
 * Returns every face of a field of a depth, its wall's bricks in play as
 * they stand, listed as {@link faceOrder} lists them: the side walls', the
 * ceiling's and the floor's, then each brick's.
 */
export function facesOf(wall: Wall, depth: number): Face[] {
  const field = fieldShapes(wall, depth);
  const faces: Face[] = [...boundsOf(depth)];
  for (let row = 0; row < depth; row++) {
    for (let column = 0; column < COLUMNS; column++) {
      faces.push(...brickFaces(field, column, row));
    }
  }
  return faces.sort((a, b) => faceOrder(a) - faceOrder(b));
}

/**
 * Returns how far a fuzzball's middle flies, from a place along a heading,
 * to meet a face, or {@link MISSED}: 0 for one it touches already.
 *
 * A face is met only flying into it, and only from its front or a hair
 * behind, as {@link OVERLAP} says; but the side walls, the ceiling and the
 * floor are met from anywhere beyond them, so no fuzzball leaves the field.
 */
export function meetsAt(
  face: Face,
  x: number,
  y: number,
  dx: number,
  dy: number,
): number {
  switch (face.kind) {
    case "flat": {
      const bounds = face.owner.kind !== "brick";
      return face.along === "across"
        ? meetsLine(y, dy, x, dx, face, bounds)
        : meetsLine(x, dx, y, dy, face, bounds);
    }
    case "floor":
      return meetsLine(
        y,
        dy,
        x,
        dx,
        { line: RADIUS, facing: 1, from: 0, to: COLUMNS },
        true,
      );
    case "slant": {
      const { facingX, facingY } = face;
      const toward = facingX * dx + facingY * dy;
      if (!(toward < 0)) {
        return MISSED;
      }
      // Its line is facingX × x + facingY × y = facingX × c, in front of it
      // the greater.
      const t = (facingX * face.c - (facingX * x + facingY * y)) / toward;
      return withinEnds(t, x, dx, face);
    }
    case "bar":
    case "eye":
      return MISSED;
    default: {
      const never: never = face;
      return never;
    }
  }
}

/**
 * Returns how far a fuzzball flies to meet a flat, its place and heading
 * given across the flat and along it, or {@link MISSED}: only a fuzzball
 * flying into it meets it, at its line, between its ends.
 */
function meetsLine(
  across: number,
  acrossD: number,
  along: number,
  alongD: number,
  {
    line,
    facing,
    from,
    to,
  }: {
    readonly line: number;
    readonly facing: Facing;
    readonly from: number;
    readonly to: number;
  },
  bounds: boolean,
): number {
  if (!(acrossD * facing < 0)) {
    return MISSED;
  }
  const t = (line - across) / acrossD;
  if (bounds) {
    return t > 0 ? t : 0;
  }
  return withinEnds(t, along, alongD, { from, to });
}

/**
 * Returns how far a fuzzball flies to meet a face whose line it meets `t`
 * along its heading, or {@link MISSED}: it touches one it lies a hair
 * behind at once, and meets one only between its ends, as far along the
 * face as `along` and `alongD` say, its place and speed that way.
 */
function withinEnds(
  t: number,
  along: number,
  alongD: number,
  { from, to }: { readonly from: number; readonly to: number },
): number {
  if (t < -OVERLAP) {
    return MISSED;
  }
  const flown = t > 0 ? t : 0;
  const at = along + alongD * flown;
  return at >= from - OVERLAP && at <= to + OVERLAP ? flown : MISSED;
}

/**
 * Returns where a face is listed among those met at one moment, the lowest
 * first: the left wall, the right wall, the ceiling and the floor, then
 * each brick's faces by its wall cell, floor up and then left to right, and
 * a brick's own by kind and the way they face. No two faces of a field
 * share a place.
 */
export function faceOrder(face: Face): number {
  switch (face.kind) {
    case "flat":
      return (
        ownerOrder(face.owner) * 16 +
        (face.along === "up" ? 2 : 0) +
        (face.facing > 0 ? 1 : 0)
      );
    case "floor":
      return 3 * 16;
    case "slant":
      return (
        ownerOrder(face.owner) * 16 +
        4 +
        (face.facingX > 0 ? 1 : 0) +
        (face.facingY > 0 ? 2 : 0)
      );
    case "bar":
    case "eye":
      return ownerOrder(face.owner) * 16;
    default: {
      const never: never = face;
      return never;
    }
  }
}

/** Returns where what a face belongs to is listed: the left wall, the right wall, the ceiling, then each brick by its wall cell. */
function ownerOrder(owner: FaceOwner): number {
  switch (owner.kind) {
    case "wall":
      return owner.side === "left" ? 0 : 1;
    case "ceiling":
      return 2;
    case "brick":
      return 4 + owner.cell;
    default: {
      const never: never = owner;
      return never;
    }
  }
}
