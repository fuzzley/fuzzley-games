// What a flying fuzzball meets next, and how far off: the side walls, the
// ceiling, the floor, the faces and corners of the bricks it can touch, and
// bumpers, everything met at one moment gathered.
//
// It walks the field in moves of a unit at most, a cell's side (C10), and
// sweeps in each only the cells the move's disc overlaps, at most nine, so
// its work grows with the distance flown, not with the wall. Each move
// starts a whole number of units from where the fuzzball was cast from, and
// @fz/core/sweep's share of a move is turned back into units flown as the
// move's start plus the share of its length. src/testing/cast_reference.ts
// walks the same moves scanning every brick, and a spec holds the two to
// the same contacts at the same moments, to the bit.

import {
  type Box,
  CORNERS,
  CORNER_AT,
  FACES,
  FACE_NORMAL,
  type Face,
  MISSED,
  type Move,
  type Solid,
  exposureOf,
  sweepCorner,
  sweepFace,
  sweepPoint,
} from "@fz/core/sweep";
import { recordOf } from "@fz/core/records";
import {
  BRICK_KINDS,
  BRICK_KIND_IDS,
  type BrickKind,
  type BrickKindId,
  type BrickKinds,
  type TraitOf,
} from "../catalog/bricks";
import {
  CEILINGWARD,
  FLOORWARD,
  LEFT,
  RIGHT,
  type Shapes,
  boxesIn,
  brickAt,
  brickBox,
  cellAt,
  shapesOf,
} from "../grid";
import { AT_ONCE, COLUMNS, RADIUS } from "../tuning";
import type { Wall } from "../wall/wall";
import type { Contact } from "./events";

/** The longest move a cast sweeps at once: a unit, a cell's side. */
const STEP = 1;

/** How far the side walls and the floor reach beyond the field, which no fuzzball goes near. */
const FAR = 1000;

/** The left side wall, whose right face a fuzzball meets. */
const LEFT_WALL: Readonly<Box> = {
  left: -FAR,
  top: -FAR,
  right: 0,
  bottom: FAR,
};

/** The right side wall, whose left face a fuzzball meets. */
const RIGHT_WALL: Readonly<Box> = {
  left: COLUMNS,
  top: -FAR,
  right: FAR,
  bottom: FAR,
};

/** The floor, whose ceilingward face a fuzzball meets. */
const FLOOR: Readonly<Box> = { left: -FAR, top: -FAR, right: FAR, bottom: 0 };

/**
 * The most contacts a cast notes, those of two moves at most, the one that
 * meets something and the next, which may meet more within `AT_ONCE` of
 * it: every face and corner of the sixteen cells their discs overlap, and
 * the field's four sides.
 */
const MOST_MET = 16 * 8 + 4;

/**
 * The widest a kind's kicking disc may reach from its middle, so the disc
 * lies in the kind's cell, which a fuzzball touching it overlaps.
 */
const MOST_KICK = 0.5;

/** The order contacts at one moment are listed in, the order `Contact` names them in. */
const CONTACT_ORDER = {
  side: 0,
  ceiling: 1,
  floor: 2,
  face: 3,
  corner: 4,
  bumper: 5,
} as const satisfies Record<Contact, number>;

/** Describes something a fuzzball meets. */
export interface Met {
  /** What it is: a side wall, the ceiling, the floor, a brick's face or corner, or a bumper. */
  what: Contact;
  /** The wall cell of the brick it is, or -1 for a side wall, the ceiling or the floor. */
  cell: number;
  /**
   * The face or corner of it met, as `@fz/core/sweep`'s `SIDE` bit, which
   * `grid.ts` names for the field: a brick's, or the face a side wall, the
   * ceiling or the floor shows the field; 0 for a bumper.
   */
  side: number;
  /** The way out of it, across, a unit long with `ny`: a face's normal, or the way from a corner or a bumper's middle to the fuzzball's. */
  nx: number;
  /** The way out of it, up. */
  ny: number;
  /** How far the fuzzball flies to meet it, from where it was cast from. */
  distance: number;
}

/** Gathers what a fuzzball meets first, as {@link cast} writes it in place. */
export interface Contacts {
  /** How far it flies to meet them: the earliest any is met, or the cast's limit if it meets none within it. */
  distance: number;
  /** Where its middle is then, across: as far along its heading from where it was cast from. */
  x: number;
  /** Where its middle is then, up. */
  y: number;
  /** How many it meets: the first `count` of `met`. */
  count: number;
  /**
   * What it meets, within `AT_ONCE` of the earliest, listed by what each
   * is, in the order `Contact` names them, so faces come before corners,
   * then by cell, from the floor up and left to right, then by side.
   */
  readonly met: Met[];
}

/** Describes a field to cast fuzzballs through, made once for a flight. */
export interface CastField {
  /** The wall as it stands, which a flight may empty a cell of as its brick breaks. */
  readonly wall: Wall;
  /** How many rows the field is deep. */
  readonly depth: number;
  /** Each kind's shape. */
  readonly shapes: Shapes;
  /** How near a fuzzball's middle comes to a round kind's middle as it meets it, by the kind's id; 0 for a kind that isn't round. */
  readonly reaches: Readonly<Record<BrickKindId, number>>;
  /** Which cells hold a box. */
  readonly boxes: Solid;
  /** The ceiling, whose floorward face a fuzzball meets. */
  readonly ceiling: Readonly<Box>;
}

/** Returns a record for {@link cast} to write what a fuzzball meets into, made once and reused. */
export function createContacts(): Contacts {
  return {
    distance: 0,
    x: 0,
    y: 0,
    count: 0,
    met: Array.from({ length: MOST_MET }, () => ({
      what: "side",
      cell: -1,
      side: 0,
      nx: 0,
      ny: 0,
      distance: 0,
    })),
  };
}

/**
 * Returns a field to cast fuzzballs through: a wall, read as it stands at
 * each cast, a depth, and the kinds its bricks are, the catalog's unless a
 * spec hands others.
 *
 * It throws for a kind that kicks from a disc wider than its cell, which a
 * cast, sweeping only the cells a fuzzball overlaps, would miss.
 */
export function castField(
  wall: Wall,
  depth: number,
  kinds: BrickKinds = BRICK_KINDS,
): CastField {
  const shapes = shapesOf(kinds);
  return {
    wall,
    depth,
    shapes,
    reaches: recordOf(BRICK_KIND_IDS, (id) => reachOf(kinds[id])),
    boxes: boxesIn(wall, depth, shapes),
    ceiling: { left: -FAR, top: depth, right: FAR, bottom: FAR },
  };
}

/** Describes a move a cast sweeps, and where it lies along the cast. */
interface Step extends Move {
  /** How far into the cast it starts: a whole number of units. */
  start: number;
  /** How long it is: a unit, or less where the cast's limit cuts it short. */
  along: number;
}

// Made once and reused, so a cast makes nothing: the move being swept and
// the box of the brick it is swept against.
const move: Step = {
  x: 0,
  y: 0,
  dx: 0,
  dy: 0,
  r: RADIUS,
  start: 0,
  along: 0,
};
const box: Box = { left: 0, top: 0, right: 0, bottom: 0 };

/**
 * Writes into `into` what a fuzzball meets first, flying from a place along
 * a heading a unit long, no farther than `limit`, and returns it.
 *
 * What lies just past the limit isn't met, though it lies within `AT_ONCE`
 * of something met at the limit, so a caller that turns the fuzzball there
 * meets it as the fuzzball flies on. A fuzzball in the field meets a side
 * wall, the ceiling or the floor within the field's diagonal, so a limit
 * past that bounds only a cast from outside the field.
 */
export function cast(
  field: CastField,
  x: number,
  y: number,
  dx: number,
  dy: number,
  limit: number,
  into: Contacts,
): Contacts {
  into.distance = MISSED;
  into.count = 0;
  for (let start = 0; start < limit; start += STEP) {
    // A move that starts past the moment met, and what is met with it, can
    // meet nothing more at once.
    if (start > into.distance + AT_ONCE) {
      break;
    }
    const along = Math.min(STEP, limit - start);
    move.x = x + dx * start;
    move.y = y + dy * start;
    move.dx = dx * along;
    move.dy = dy * along;
    move.start = start;
    move.along = along;
    sweepMove(field, into);
  }
  if (into.count === 0) {
    into.distance = limit;
  } else {
    keepAtOnce(into);
  }
  into.x = x + dx * into.distance;
  into.y = y + dy * into.distance;
  return into;
}

/** Notes what the {@link move} meets. */
function sweepMove(field: CastField, into: Contacts): void {
  noteFace(LEFT_WALL, RIGHT, "side", -1, into);
  noteFace(RIGHT_WALL, LEFT, "side", -1, into);
  noteFace(field.ceiling, FLOORWARD, "ceiling", -1, into);
  noteFace(FLOOR, CEILINGWARD, "floor", -1, into);
  const { wall, depth, shapes } = field;
  const { x, y, dx, dy, r } = move;
  // The cells the move's disc overlaps, and those it only touches at an
  // edge, where a face's end or a corner lies.
  const firstColumn = Math.max(0, Math.ceil(Math.min(x, x + dx) - r) - 1);
  const lastColumn = Math.min(COLUMNS - 1, Math.floor(Math.max(x, x + dx) + r));
  const firstRow = Math.max(0, Math.ceil(Math.min(y, y + dy) - r) - 1);
  const lastRow = Math.min(depth - 1, Math.floor(Math.max(y, y + dy) + r));
  for (let row = firstRow; row <= lastRow; row++) {
    for (let column = firstColumn; column <= lastColumn; column++) {
      const brick = brickAt(wall, depth, column, row);
      if (brick !== null) {
        const cell = cellAt(wall, column, row);
        switch (shapes[brick.kind]) {
          case "box":
            noteBox(field, column, row, cell, into);
            break;
          case "round":
            noteBumper(field.reaches[brick.kind], column, row, cell, into);
            break;
          case "open":
            break;
        }
      }
    }
  }
}

/** Notes what the {@link move} meets of the exposed faces and corners of the brick in a field cell. */
function noteBox(
  field: CastField,
  column: number,
  row: number,
  cell: number,
  into: Contacts,
): void {
  const exposure = exposureOf(field.boxes, column, row);
  brickBox(column, row, box);
  for (const face of FACES) {
    if ((exposure & face) !== 0) {
      noteFace(box, face, "face", cell, into);
    }
  }
  for (const corner of CORNERS) {
    if ((exposure & corner) !== 0) {
      const at = CORNER_AT[corner];
      const t = sweepCorner(move, box, corner);
      notePoint(box[at.x], box[at.y], t, "corner", cell, corner, into);
    }
  }
}

/** Notes when the {@link move} meets a bumper in a field cell, its middle within `reach` of the cell's. */
function noteBumper(
  reach: number,
  column: number,
  row: number,
  cell: number,
  into: Contacts,
): void {
  const middleX = column + 0.5;
  const middleY = row + 0.5;
  const t = sweepPoint(move, middleX, middleY, reach);
  notePoint(middleX, middleY, t, "bumper", cell, 0, into);
}

/** Notes when the {@link move} meets a face of a box, if it does. */
function noteFace(
  target: Readonly<Box>,
  face: Face,
  what: Contact,
  cell: number,
  into: Contacts,
): void {
  const t = sweepFace(move, target, face);
  if (t !== MISSED) {
    const normal = FACE_NORMAL[face];
    note(what, cell, face, normal.x, normal.y, t, into);
  }
}

/**
 * Notes when the {@link move} comes within reach of a point, a share `t`
 * through it, if it does: the way out is the line from the point to the
 * fuzzball's middle, a unit long whatever its length as met, which is less
 * than the reach where the fuzzball overlaps it already (C5).
 */
function notePoint(
  px: number,
  py: number,
  t: number,
  what: Contact,
  cell: number,
  side: number,
  into: Contacts,
): void {
  if (t === MISSED) {
    return;
  }
  // A fuzzball whose middle lies on the point moves neither toward it nor
  // away, and meets it never, so the line has a length.
  const ox = move.x + move.dx * t - px;
  const oy = move.y + move.dy * t - py;
  const length = Math.sqrt(ox * ox + oy * oy);
  note(what, cell, side, ox / length, oy / length, t, into);
}

/**
 * Notes a contact met a share `t` through the {@link move}, unless it is met
 * later than `AT_ONCE` after the earliest so far, or is noted already, as
 * one met as a move ends is again as the next starts.
 */
function note(
  what: Contact,
  cell: number,
  side: number,
  nx: number,
  ny: number,
  t: number,
  into: Contacts,
): void {
  const distance = move.start + t * move.along;
  if (distance > into.distance + AT_ONCE) {
    return;
  }
  if (distance < into.distance) {
    into.distance = distance;
  }
  let noted = 0;
  for (const contact of into.met) {
    if (noted === into.count) {
      contact.what = what;
      contact.cell = cell;
      contact.side = side;
      contact.nx = nx;
      contact.ny = ny;
      contact.distance = distance;
      into.count++;
      return;
    }
    if (
      contact.what === what &&
      contact.cell === cell &&
      contact.side === side
    ) {
      return;
    }
    noted++;
  }
}

/**
 * Keeps of the contacts noted those met within `AT_ONCE` of the earliest,
 * in {@link Contacts.met}'s order: it sorts those met later after them, and
 * leaves them out of the count.
 */
function keepAtOnce(into: Contacts): void {
  const { met } = into;
  const latest = into.distance + AT_ONCE;
  for (let i = 1; i < into.count; i++) {
    for (let j = i; j > 0; j--) {
      const before = met[j - 1];
      const contact = met[j];
      if (
        before === undefined ||
        contact === undefined ||
        !comesBefore(contact, before, latest)
      ) {
        break;
      }
      met[j - 1] = contact;
      met[j] = before;
    }
  }
  let kept = 0;
  for (const contact of met) {
    if (kept === into.count || contact.distance > latest) {
      break;
    }
    kept++;
  }
  into.count = kept;
}

/** Returns whether a contact is listed before another: one met at once before one met later, then by {@link orderOf}. */
function comesBefore(
  contact: Readonly<Met>,
  other: Readonly<Met>,
  latest: number,
): boolean {
  const late = contact.distance > latest;
  return late === other.distance > latest
    ? orderOf(contact) < orderOf(other)
    : !late;
}

/**
 * Returns where a contact is listed among those met at one moment: by what
 * it is, then by cell, then by side, as one number, since a wall holds
 * fewer than 65,536 cells and a side is a bit under 256.
 */
function orderOf({ what, cell, side }: Readonly<Met>): number {
  return (CONTACT_ORDER[what] * 65536 + cell + 1) * 256 + side;
}

/**
 * Returns how near a fuzzball's middle comes to the middle of a kind of
 * brick that kicks as it meets it, its radius and the kick's disc's, or 0
 * for one that doesn't kick, throwing for a disc wider than its cell.
 */
function reachOf(kind: BrickKind): number {
  const kick = kind.traits.find(
    (trait): trait is TraitOf["kicks"] => trait.kind === "kicks",
  );
  if (kick === undefined) {
    return 0;
  }
  if (kick.radius > MOST_KICK) {
    throw new RangeError(
      `${kind.name} kicks from a disc ${String(kick.radius)} from its middle, wider than its cell.`,
    );
  }
  return RADIUS + kick.radius;
}
