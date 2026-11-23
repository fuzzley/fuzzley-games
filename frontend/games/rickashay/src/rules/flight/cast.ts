// What a flying fuzzball's middle meets next, and how far off: the side
// walls, the ceiling, the floor, the faces of the bricks in play and the
// portals' eyes, everything met within AT_ONCE of the soonest gathered, as
// C3 has a moment's contacts gathered before any turns it.
//
// A cast walks the field a cell at a time along the middle's line, and in
// each cell tries only the faces that reach into it, which the field keeps
// for every cell, so its work grows with the distance flown, not with the
// wall, and it makes nothing as it goes.

import { AT_ONCE, COLUMNS } from "@fz/brick-wall/rules/field";
import { columnOf, fieldRowOf } from "@fz/brick-wall/rules/grid";
import type { Wall } from "../catalog/kinds";
import { EYE } from "../tuning";
import {
  type BrickFace,
  type Face,
  type FieldShapes,
  MISSED,
  SHAPE,
  boundsOf,
  brickFaces,
  faceOrder,
  fieldShapes,
  meetsAt,
} from "./faces";

/**
 * How far past a cell's edges a face is still kept among the faces that
 * reach into it: well over `OVERLAP` and what a sum rounds by, so a face
 * met at a hair past its end, or at a cell's edge, is tried in each cell
 * the middle may be in as it meets it.
 */
const REACH = 1e-6;

/**
 * The most contacts a cast gathers at one moment: every face of the nine
 * bricks about the place it meets them, each showing at most two faces
 * that meet at a point, and two of the field's bounds, at its corner.
 */
const MOST_MET = 9 * 2 + 2;

/**
 * Describes a field to cast fuzzballs through, as a flight's bricks stand:
 * built once for a wall and a depth, and copied for each flight, whose
 * bricks breaking and hatches opening change its copy alone.
 */
export interface CastField extends FieldShapes {
  /** The faces each field cell's brick shows, by field cell. */
  readonly own: (readonly BrickFace[])[];
  /** The faces that reach into each field cell, whoever's they are, which a cast tries as its middle passes through the cell. */
  readonly within: (readonly BrickFace[])[];
  /** The side walls', the ceiling's and the floor's faces, which every cast tries. */
  readonly bounds: readonly Face[];
}

/** Describes something a fuzzball meets, as {@link cast} writes it. */
export interface Contact {
  /** The face it meets, with what owns it. */
  face: Face;
  /** How far it flies to meet it, from where it was cast from. */
  distance: number;
}

/** Gathers what a fuzzball meets first, as {@link cast} writes it in place. */
export interface Contacts {
  /** How far it flies to meet them: the soonest any is met. */
  distance: number;
  /** Where its middle is then, across: as far along its heading from where it was cast from. */
  x: number;
  /** Where its middle is then, up. */
  y: number;
  /** How many it meets: the first `count` of `met`. */
  count: number;
  /** What it meets within `AT_ONCE` of the soonest, each once, listed as `faceOrder()` lists their faces. */
  readonly met: Contact[];
}

/** Returns a record for {@link cast} to write what a fuzzball meets into, made once and reused. */
export function createContacts(): Contacts {
  const floor: Face = { kind: "floor" };
  return {
    distance: 0,
    x: 0,
    y: 0,
    count: 0,
    met: Array.from({ length: MOST_MET }, () => ({
      face: floor,
      distance: 0,
    })),
  };
}

/** Returns a field to cast fuzzballs through, of a depth, its bricks the wall's in play as a flight starts. */
export function castField(wall: Wall, depth: number): CastField {
  const shapes = fieldShapes(wall, depth);
  const cells = COLUMNS * depth;
  const own = Array.from({ length: cells }, (_, cell) =>
    brickFaces(shapes, cell % COLUMNS, Math.floor(cell / COLUMNS)),
  );
  const field: CastField = {
    ...shapes,
    own,
    within: Array.from({ length: cells }, () => []),
    bounds: boundsOf(depth),
  };
  for (let cell = 0; cell < cells; cell++) {
    gather(field, cell % COLUMNS, Math.floor(cell / COLUMNS));
  }
  return field;
}

/**
 * Returns a copy of a field that clearBrick() and openHatches() may change
 * while the field stays as it was.
 *
 * They change a field's shapes in place, and give a cell new lists of
 * faces rather than change one, so the copy's own are its shapes and its
 * two lists of cells' faces; a change to either rule keeps to that.
 */
export function copyField(field: CastField): CastField {
  return {
    ...field,
    shapes: field.shapes.slice(),
    own: [...field.own],
    within: [...field.within],
  };
}

/**
 * Takes a brick that broke out of a field, by its wall cell, which holds a
 * brick in play, so the bricks about it show the faces it hid and a cast
 * passes through its cell.
 */
export function clearBrick(field: CastField, cell: number): void {
  const column = columnOf(cell);
  const row = fieldRowOf(field, cell);
  field.shapes[row * COLUMNS + column] = SHAPE.air;
  reface(field, column, row);
}

/**
 * Opens every hatch in a field, as the hatches do at their last hold: a
 * hatch's cell is air until the flight ends, and the bricks about it,
 * faced as if it weren't there, are faced as they were.
 */
export function openHatches(field: CastField): void {
  for (let cell = 0; cell < field.shapes.length; cell++) {
    if (field.shapes[cell] === SHAPE.hatch) {
      field.shapes[cell] = SHAPE.air;
      reface(field, cell % COLUMNS, Math.floor(cell / COLUMNS));
    }
  }
}

/**
 * Builds again the faces of the bricks about a field cell, its own among
 * them, and the faces that reach into each cell they reach into.
 */
function reface(field: CastField, column: number, row: number): void {
  for (let near = row - 1; near <= row + 1; near++) {
    for (let beside = column - 1; beside <= column + 1; beside++) {
      if (isInField(field, beside, near)) {
        field.own[near * COLUMNS + beside] = brickFaces(field, beside, near);
      }
    }
  }
  for (let near = row - 2; near <= row + 2; near++) {
    for (let beside = column - 2; beside <= column + 2; beside++) {
      if (isInField(field, beside, near)) {
        gather(field, beside, near);
      }
    }
  }
}

/** Returns whether a cell lies in a field. */
function isInField(
  { depth }: FieldShapes,
  column: number,
  row: number,
): boolean {
  return column >= 0 && column < COLUMNS && row >= 0 && row < depth;
}

/**
 * Writes the faces that reach into a field cell: those of the bricks in
 * the cells about it, which alone reach into it, since a face lies no
 * farther than a radius from its brick's cell.
 */
function gather(field: CastField, column: number, row: number): void {
  const within: BrickFace[] = [];
  for (let near = row - 1; near <= row + 1; near++) {
    for (let beside = column - 1; beside <= column + 1; beside++) {
      const faces = isInField(field, beside, near)
        ? field.own[near * COLUMNS + beside]
        : undefined;
      for (const face of faces ?? []) {
        if (reachesInto(face, column, row)) {
          within.push(face);
        }
      }
    }
  }
  field.within[row * COLUMNS + column] = within;
}

/** Returns whether a face reaches into a field cell, or within {@link REACH} of it. */
function reachesInto(face: BrickFace, column: number, row: number): boolean {
  switch (face.kind) {
    case "flat":
      return face.along === "across"
        ? overlaps(face.from, face.to, face.line, face.line, column, row)
        : overlaps(face.line, face.line, face.from, face.to, column, row);
    case "slant": {
      // Its line is x + y = c where it faces right and up or left and
      // down, and x − y = c where it faces right and down or left and up.
      const sum = face.facingX === face.facingY;
      return overlaps(
        face.from,
        face.to,
        sum ? face.c - face.to : face.from - face.c,
        sum ? face.c - face.from : face.to - face.c,
        column,
        row,
      );
    }
    case "bar":
      return overlaps(face.from, face.to, face.line, face.line, column, row);
    case "eye":
      return overlaps(
        face.x - EYE / 2,
        face.x + EYE / 2,
        face.y - EYE / 2,
        face.y + EYE / 2,
        column,
        row,
      );
  }
}

/** Returns whether a box, from its least x and y to its most, lies within {@link REACH} of a field cell. */
function overlaps(
  leastX: number,
  mostX: number,
  leastY: number,
  mostY: number,
  column: number,
  row: number,
): boolean {
  return (
    leastX <= column + 1 + REACH &&
    mostX >= column - REACH &&
    leastY <= row + 1 + REACH &&
    mostY >= row - REACH
  );
}

/**
 * Writes into `into` what a fuzzball's middle meets first, flying from a
 * place along a heading a unit long, and returns it: every face it meets
 * within `AT_ONCE` of the soonest, the side walls', the ceiling's and the
 * floor's among them, and the portals' eyes where `eyes` is true. A
 * fuzzball passes every eye as air from a teleport until it next turns
 * (C6), and is cast then with `eyes` false.
 *
 * A fuzzball in the field, flying any way, meets a side wall, the ceiling
 * or the floor by the field's diagonal, so a cast always meets something.
 */
export function cast(
  field: CastField,
  x: number,
  y: number,
  dx: number,
  dy: number,
  eyes: boolean,
  into: Contacts,
): Contacts {
  into.distance = MISSED;
  into.count = 0;
  for (const face of field.bounds) {
    note(face, meetsAt(face, x, y, dx, dy), into);
  }
  const lastRow = field.depth - 1;
  let column = Math.min(Math.max(Math.floor(x), 0), COLUMNS - 1);
  let row = Math.min(Math.max(Math.floor(y), 0), lastRow);
  for (;;) {
    const within = field.within[row * COLUMNS + column];
    if (within !== undefined) {
      for (const face of within) {
        if (eyes || face.kind !== "eye") {
          note(face, meetsAt(face, x, y, dx, dy), into);
        }
      }
    }
    // How far the middle flies to the next column and the next row, from
    // the edges of the cell it is in.
    const toColumn =
      dx > 0
        ? (column + 1 - x) / dx
        : dx < 0
          ? (column - x) / dx
          : Number.POSITIVE_INFINITY;
    const toRow =
      dy > 0
        ? (row + 1 - y) / dy
        : dy < 0
          ? (row - y) / dy
          : Number.POSITIVE_INFINITY;
    if (Math.min(toColumn, toRow) > into.distance + AT_ONCE) {
      break;
    }
    if (toColumn <= toRow) {
      column += dx > 0 ? 1 : -1;
    }
    if (toRow <= toColumn) {
      row += dy > 0 ? 1 : -1;
    }
    if (column < 0 || column >= COLUMNS || row < 0 || row > lastRow) {
      break;
    }
  }
  sortMet(into);
  into.x = x + dx * into.distance;
  into.y = y + dy * into.distance;
  return into;
}

/**
 * Notes a face met at a distance, unless it is met later than `AT_ONCE`
 * after the soonest so far, or never, or is noted already, as one that
 * reaches into two cells is met in each; one met sooner than the soonest
 * leaves out those it leaves more than `AT_ONCE` behind.
 */
function note(face: Face, distance: number, into: Contacts): void {
  if (distance === MISSED || distance > into.distance + AT_ONCE) {
    return;
  }
  if (distance < into.distance) {
    into.distance = distance;
    keepAtOnce(into);
  }
  let index = 0;
  for (const contact of into.met) {
    if (index === into.count) {
      contact.face = face;
      contact.distance = distance;
      into.count++;
      return;
    }
    if (contact.face === face) {
      return;
    }
    index++;
  }
}

/** Keeps of the contacts noted those within `AT_ONCE` of the soonest, in the order they were noted. */
function keepAtOnce(into: Contacts): void {
  const { met } = into;
  const latest = into.distance + AT_ONCE;
  let kept = 0;
  for (let index = 0; index < into.count; index++) {
    const contact = met[index];
    const slot = met[kept];
    if (
      contact === undefined ||
      slot === undefined ||
      contact.distance > latest
    ) {
      continue;
    }
    met[index] = slot;
    met[kept] = contact;
    kept++;
  }
  into.count = kept;
}

/** Lists the contacts noted as {@link faceOrder} lists their faces. */
function sortMet(into: Contacts): void {
  const { met } = into;
  for (let i = 1; i < into.count; i++) {
    for (let j = i; j > 0; j--) {
      const before = met[j - 1];
      const contact = met[j];
      if (
        before === undefined ||
        contact === undefined ||
        faceOrder(contact.face) >= faceOrder(before.face)
      ) {
        break;
      }
      met[j - 1] = contact;
      met[j] = before;
    }
  }
}
