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
// leave a fuzzball's middle no way in. A ramp's long face, and each of a
// gem's four, stands off its line by STAND_OFF, a radius out, and its
// points are cut square by short flats. A hatch is a bar along its cell's
// top and nothing under it, so the bricks about it are faced as if it
// weren't there (C7). A portal is air but for its eye, the half-unit square
// at the middle of its cell, and all air while its twin waits over the
// ceiling (C6).

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
  fieldRowOf,
} from "@fz/brick-wall/rules/grid";
import { type Brick, type Wall, kindOf } from "../catalog/kinds";
import { EYE, STAND_OFF } from "../tuning";

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

/** Names a brick, as a face it shows is owned. */
type BrickOwner = Extract<FaceOwner, { readonly kind: "brick" }>;

/** What {@link meetsAt} returns for a face a fuzzball never meets. */
export const MISSED = Number.POSITIVE_INFINITY;

/**
 * How far past its ends, and behind its line, a face is still met: a
 * hair, so a face and the one it joins meet with no gap between them,
 * however a flight's sums round, and a fuzzball a hair past a face it
 * turned off can't fly through it.
 */
export const OVERLAP = AT_ONCE;

/** How long the short flat is that cuts a ramp's or a gem's point square, from the point's side of its cell to its long face. */
const TIP = STAND_OFF - RADIUS;

/** The floor's line, a radius up, as {@link meetsAt} meets it: made once, so a cast makes nothing. */
const FLOOR_LINE = { line: RADIUS, facing: 1, from: 0, to: COLUMNS } as const;

/**
 * The shapes a field cell's brick takes, as its faces and those beside it
 * are built: none, the box of its cell, the side walls and the ceiling
 * beyond the field, which fill every side of their cells, a ramp by the
 * corner of its cell its right angle sits in, a gem, a hatch, which is
 * only a bar along its cell's top, and a portal whose twin is in play,
 * which is only its eye.
 */
export const SHAPE = {
  air: 0,
  box: 1,
  beyond: 2,
  /** A ramp whose right angle sits in its cell's floorward left corner, `L`. */
  rampFloorwardLeft: 3,
  /** A ramp whose right angle sits in its cell's floorward right corner, `J`. */
  rampFloorwardRight: 4,
  /** A ramp whose right angle sits in its cell's ceilingward left corner, `F`. */
  rampCeilingwardLeft: 5,
  /** A ramp whose right angle sits in its cell's ceilingward right corner, `7`. */
  rampCeilingwardRight: 6,
  gem: 7,
  hatch: 8,
  portal: 9,
} as const;

/** A field cell's shape, one of {@link SHAPE}'s. */
export type Shape = (typeof SHAPE)[keyof typeof SHAPE];

/** The sides of its cell each shape fills from end to end, as `FieldFace` bits: a brick beside it shows no face toward one it fills. */
const FILLS: Readonly<Record<Shape, number>> = {
  [SHAPE.air]: 0,
  [SHAPE.box]: FLOORWARD | CEILINGWARD | LEFT | RIGHT,
  [SHAPE.beyond]: FLOORWARD | CEILINGWARD | LEFT | RIGHT,
  [SHAPE.rampFloorwardLeft]: FLOORWARD | LEFT,
  [SHAPE.rampFloorwardRight]: FLOORWARD | RIGHT,
  [SHAPE.rampCeilingwardLeft]: CEILINGWARD | LEFT,
  [SHAPE.rampCeilingwardRight]: CEILINGWARD | RIGHT,
  [SHAPE.gem]: 0,
  // A hatch fills no side of its cell for a brick beside it, but joins a
  // hatch beside it into one bar (hatchFaces()).
  [SHAPE.hatch]: 0,
  [SHAPE.portal]: 0,
};

/** The corners of its cell each shape reaches, as `rules/grid`'s corner bits: no corner beside one it reaches is cut. */
const REACHES: Readonly<Record<Shape, number>> = {
  [SHAPE.air]: 0,
  [SHAPE.box]:
    FLOORWARD_LEFT | FLOORWARD_RIGHT | CEILINGWARD_LEFT | CEILINGWARD_RIGHT,
  [SHAPE.beyond]:
    FLOORWARD_LEFT | FLOORWARD_RIGHT | CEILINGWARD_LEFT | CEILINGWARD_RIGHT,
  // A ramp reaches every corner of its cell but the one across from its
  // right angle.
  [SHAPE.rampFloorwardLeft]:
    FLOORWARD_LEFT | FLOORWARD_RIGHT | CEILINGWARD_LEFT,
  [SHAPE.rampFloorwardRight]:
    FLOORWARD_LEFT | FLOORWARD_RIGHT | CEILINGWARD_RIGHT,
  [SHAPE.rampCeilingwardLeft]:
    FLOORWARD_LEFT | CEILINGWARD_LEFT | CEILINGWARD_RIGHT,
  [SHAPE.rampCeilingwardRight]:
    FLOORWARD_RIGHT | CEILINGWARD_LEFT | CEILINGWARD_RIGHT,
  [SHAPE.gem]: 0,
  [SHAPE.hatch]: 0,
  [SHAPE.portal]: 0,
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

/**
 * Returns what stands in each cell of a field of a depth, from the wall's
 * bricks in play: a portal's cell is air while its twin waits over the
 * ceiling.
 */
export function fieldShapes(wall: Wall, depth: number): FieldShapes {
  const shapes = new Uint8Array(COLUMNS * depth);
  for (let row = 0; row < depth; row++) {
    for (let column = 0; column < COLUMNS; column++) {
      const brick = brickAt(wall, depth, column, row);
      if (brick !== null) {
        shapes[row * COLUMNS + column] = shapeOf(brick, wall, depth);
      }
    }
  }
  return { depth, lowestRow: wall.lowestRow, shapes };
}

/**
 * Returns the shape a brick's kind gives it: a ramp's, by the corner its
 * plates name, where its kind slants; a gem's, where it is faceted; a
 * hatch's where it holds; a portal's where it teleports, or air while its
 * twin waits over the ceiling of a field of a depth; and a box where none
 * of its traits shapes it.
 */
function shapeOf(brick: Brick, wall: Wall, depth: number): Shape {
  for (const trait of kindOf(brick.kind).traits) {
    switch (trait.kind) {
      case "slants":
        return rampOf(brick.plates);
      case "faceted":
        return SHAPE.gem;
      case "holds":
        return SHAPE.hatch;
      case "teleports":
        return brick.twin !== null && fieldRowOf(wall, brick.twin) < depth
          ? SHAPE.portal
          : SHAPE.air;
      case "never":
      case "springs":
      case "plated":
      case "regrows":
      case "bolted":
        break;
    }
  }
  return SHAPE.box;
}

/** Returns the ramp whose right angle sits in the corner its plates name: the two faces of its cell its short sides lie along. */
function rampOf(plates: number): Shape {
  if ((plates & CEILINGWARD) !== 0) {
    return (plates & RIGHT) !== 0
      ? SHAPE.rampCeilingwardRight
      : SHAPE.rampCeilingwardLeft;
  }
  return (plates & RIGHT) !== 0
    ? SHAPE.rampFloorwardRight
    : SHAPE.rampFloorwardLeft;
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
  owner: BrickOwner,
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
 * Returns the faces the brick in a field cell shows, owned by its wall
 * cell, as its shape and those about it give them. A cell with no brick
 * shows none.
 */
export function brickFaces(
  field: FieldShapes,
  column: number,
  row: number,
): BrickFace[] {
  const shape = shapeAt(field, column, row);
  if (shape === SHAPE.air || shape === SHAPE.beyond) {
    return [];
  }
  const owner: BrickOwner = {
    kind: "brick",
    cell: cellOf(column, row - field.lowestRow),
  };
  switch (shape) {
    case SHAPE.box:
      return boxFaces(field, column, row, owner);
    case SHAPE.rampFloorwardLeft:
    case SHAPE.rampFloorwardRight:
    case SHAPE.rampCeilingwardLeft:
    case SHAPE.rampCeilingwardRight:
      return rampFaces(field, column, row, shape, owner);
    case SHAPE.gem:
      return gemFaces(column, row, owner);
    case SHAPE.hatch:
      return hatchFaces(field, column, row, owner);
    case SHAPE.portal:
      return [{ kind: "eye", x: column + 0.5, y: row + 0.5, owner }];
  }
}

/**
 * Returns a hatch's faces: its bar, a flat across the top of its cell a
 * radius up, where nothing stands on it, met only coming down, and a cut
 * across each end where nothing stands beside it. A hatch beside it is one
 * bar with it, so that end is not cut.
 */
function hatchFaces(
  field: FieldShapes,
  column: number,
  row: number,
  owner: BrickOwner,
): BrickFace[] {
  if (!isOpen(field, column, row, CEILINGWARD)) {
    return [];
  }
  const faces: BrickFace[] = [
    {
      kind: "bar",
      line: row + 1 + RADIUS,
      from: column,
      to: column + 1,
      owner,
    },
  ];
  for (const [side, x, facingX] of [
    [LEFT, column, -1],
    [RIGHT, column + 1, 1],
  ] as const) {
    if (
      shapeAt(field, column + facingX, row) !== SHAPE.hatch &&
      isOpen(field, column, row, side) &&
      isFree(field, column, row, x, row + 1)
    ) {
      faces.push(cut(x, row + 1, facingX, 1, owner));
    }
  }
  return faces;
}

/**
 * Returns a box's faces: a flat a radius out from each of its open sides,
 * and a cut across each free corner between two of them.
 */
function boxFaces(
  field: FieldShapes,
  column: number,
  row: number,
  owner: BrickOwner,
): BrickFace[] {
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
 * Returns a ramp's faces: a flat a radius out from each of its two short
 * sides that is open, and a cut across their corner where it is free; a
 * short flat cutting each of its points square where the side of its cell
 * the point touches is open, and a cut where it meets the short side's
 * flat; and its long face, a radius out from its long side, facing away
 * from its right angle.
 */
function rampFaces(
  field: FieldShapes,
  column: number,
  row: number,
  shape: Shape,
  owner: BrickOwner,
): BrickFace[] {
  const right =
    shape === SHAPE.rampFloorwardRight || shape === SHAPE.rampCeilingwardRight;
  const top =
    shape === SHAPE.rampCeilingwardLeft || shape === SHAPE.rampCeilingwardRight;
  // Its right angle, at (x, y); the way its short sides run from there,
  // which is the way its long face looks; and the other way, which their
  // flats look.
  const x = right ? column + 1 : column;
  const y = top ? row + 1 : row;
  const sx: Facing = right ? -1 : 1;
  const sy: Facing = top ? -1 : 1;
  const backX: Facing = right ? 1 : -1;
  const backY: Facing = top ? 1 : -1;
  const legAcross = isOpen(field, column, row, top ? CEILINGWARD : FLOORWARD);
  const legUp = isOpen(field, column, row, right ? RIGHT : LEFT);
  const faces: BrickFace[] = [];
  if (legAcross) {
    faces.push(across(y - sy * RADIUS, column, column + 1, backY, owner));
  }
  if (legUp) {
    faces.push(up(x - sx * RADIUS, row, row + 1, backX, owner));
  }
  if (legAcross && legUp && isFree(field, column, row, x, y)) {
    faces.push(cut(x, y, backX, backY, owner));
  }
  // The point at the end of the short side across, and at the end of the
  // one up.
  if (isOpen(field, column, row, right ? LEFT : RIGHT)) {
    const end = y + sy * TIP;
    faces.push(
      up(x + sx + sx * RADIUS, Math.min(y, end), Math.max(y, end), sx, owner),
    );
    if (legAcross && isFree(field, column, row, x + sx, y)) {
      faces.push(cut(x + sx, y, sx, backY, owner));
    }
  }
  if (isOpen(field, column, row, top ? FLOORWARD : CEILINGWARD)) {
    const end = x + sx * TIP;
    faces.push(
      across(
        y + sy + sy * RADIUS,
        Math.min(x, end),
        Math.max(x, end),
        sy,
        owner,
      ),
    );
    if (legUp && isFree(field, column, row, x, y + sy)) {
      faces.push(cut(x, y + sy, backX, sy, owner));
    }
  }
  // sx × x + sy × y = 1 along its long side, STAND_OFF further out.
  faces.push(
    longFace(
      sx,
      sy,
      x + sx * sy * y + sx * (1 + STAND_OFF),
      x + sx * TIP,
      x + sx * (1 + RADIUS),
      owner,
    ),
  );
  return faces;
}

/**
 * Returns a gem's faces: its four long faces, each a radius out from a side
 * of the square it stands as on its point, and a short flat cutting each
 * of its four points square, a radius out from the side of its cell the
 * point touches.
 */
function gemFaces(column: number, row: number, owner: BrickOwner): BrickFace[] {
  const middleX = column + 0.5;
  const middleY = row + 0.5;
  const faces: BrickFace[] = [];
  for (const [sx, sy] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const) {
    // sx × x + sy × y = 0.5 about its middle along each side, STAND_OFF
    // further out.
    faces.push(
      longFace(
        sx,
        sy,
        middleX + sx * sy * middleY + sx * (0.5 + STAND_OFF),
        middleX + sx * TIP,
        middleX + sx * (0.5 + RADIUS),
        owner,
      ),
    );
  }
  faces.push(
    across(row - RADIUS, middleX - TIP, middleX + TIP, -1, owner),
    across(row + 1 + RADIUS, middleX - TIP, middleX + TIP, 1, owner),
    up(column - RADIUS, middleY - TIP, middleY + TIP, -1, owner),
    up(column + 1 + RADIUS, middleY - TIP, middleY + TIP, 1, owner),
  );
  return faces;
}

/** Returns a long 45° face, a ramp's or a gem's, its line's c given, spanning the x between two ends. */
function longFace(
  facingX: Facing,
  facingY: Facing,
  c: number,
  end: number,
  otherEnd: number,
  owner: BrickOwner,
): BrickFace {
  return {
    kind: "slant",
    facingX,
    facingY,
    c,
    from: Math.min(end, otherEnd),
    to: Math.max(end, otherEnd),
    long: true,
    owner,
  };
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
      return meetsLine(y, dy, x, dx, FLOOR_LINE, true);
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
      // Met only coming down onto it.
      return dy < 0 ? withinEnds((face.line - y) / dy, x, dx, face) : MISSED;
    case "eye":
      return meetsEye(face, x, y, dx, dy);
  }
}

/**
 * Returns how far a fuzzball flies before its middle crosses into a
 * portal's eye, or {@link MISSED}: at once where it is in the eye already,
 * but never where it only grazes the eye's edge or corner, or lies no more
 * than {@link OVERLAP} inside its far edge and is leaving, so a middle a
 * rounding inside it is not taken as it leaves.
 */
function meetsEye(
  { x: middleX, y: middleY }: { readonly x: number; readonly y: number },
  x: number,
  y: number,
  dx: number,
  dy: number,
): number {
  const enter = Math.max(
    entersBand(x - middleX, dx),
    entersBand(y - middleY, dy),
    0,
  );
  const leave = Math.min(
    leavesBand(x - middleX, dx),
    leavesBand(y - middleY, dy),
  );
  return leave - enter > OVERLAP ? enter : MISSED;
}

/**
 * Returns how far a fuzzball's middle flies, from `offset` off an eye's
 * middle one way and at `speed` that way, to come into the band the eye
 * spans that way: −∞ for one in it and flying along it, and ∞ for one
 * flying along it outside it or on its edge.
 */
function entersBand(offset: number, speed: number): number {
  const half = EYE / 2;
  if (speed > 0) {
    return (-half - offset) / speed;
  }
  if (speed < 0) {
    return (half - offset) / speed;
  }
  return offset > -half && offset < half
    ? Number.NEGATIVE_INFINITY
    : Number.POSITIVE_INFINITY;
}

/**
 * Returns how far a fuzzball's middle flies, as {@link entersBand} has it,
 * to leave the band an eye spans: ∞ for one in it and flying along it, and
 * −∞ for one flying along it outside it.
 */
function leavesBand(offset: number, speed: number): number {
  const half = EYE / 2;
  if (speed > 0) {
    return (half - offset) / speed;
  }
  if (speed < 0) {
    return (-half - offset) / speed;
  }
  return offset > -half && offset < half
    ? Number.POSITIVE_INFINITY
    : Number.NEGATIVE_INFINITY;
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
      return ownerOrder(face.owner) * 16 + 8;
    case "eye":
      return ownerOrder(face.owner) * 16;
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
  }
}
