// cast() done the plain way, for a spec to hold it to: the same moves, each
// swept against every brick of the wall in play rather than the cells along
// the way, everything met put in a list, then the earliest and those within
// AT_ONCE of it kept, each once, in Contacts.met's order. It works out from
// the kinds alone what castField() works out for cast(), each kind's shape,
// a bumper's reach and the boxes, and its numbers as cast() does, so the
// two agree to the bit where they meet the same things. With it, the seeded
// random walls and shots the property spec and the benchmark cast through.

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
import { AIMS } from "../rules/aims";
import {
  BRICK_KIND_IDS,
  type BrickKind,
  type BrickKinds,
} from "../rules/catalog/bricks";
import type { Contacts, Met } from "../rules/flight/cast";
import type { Contact } from "../rules/flight/events";
import {
  CEILINGWARD,
  FLOORWARD,
  LEFT,
  RIGHT,
  brickAt,
  brickBox,
  columnOf,
  fieldRowOf,
  shapeOf,
} from "../rules/grid";
import {
  AT_ONCE,
  COLUMNS,
  LEAST_DEPTH,
  MOST_DEPTH,
  RADIUS,
} from "../rules/tuning";
import type { Brick, Wall } from "../rules/wall/wall";
import { STAND_INS } from "./stand_ins";

/** How long each move is, but the last: a unit, as C10 has cast() walk. */
const STEP = 1;

/** Describes what a cast met, as plain values a spec compares. */
export interface Cast {
  readonly distance: number;
  readonly x: number;
  readonly y: number;
  readonly met: readonly Readonly<Met>[];
}

/** Describes a field drawn for a spec: a wall, the field's depth and the kinds of its bricks. */
export interface RandomField {
  readonly wall: Wall;
  readonly depth: number;
  readonly kinds: BrickKinds;
}

/** Describes a shot to cast: a field, and a fuzzball's place, heading and limit. */
export interface RandomCast {
  readonly field: RandomField;
  readonly x: number;
  readonly y: number;
  readonly dx: number;
  readonly dy: number;
  readonly limit: number;
}

/** Describes one of a cast's moves, and where it lies along the cast. */
interface Step extends Move {
  /** How far into the cast it starts. */
  readonly start: number;
  /** How long it is. */
  readonly along: number;
}

/** Returns what {@link cast} wrote into a record, as plain values. */
export function castOf(contacts: Readonly<Contacts>): Cast {
  return {
    distance: contacts.distance,
    x: contacts.x,
    y: contacts.y,
    met: contacts.met.slice(0, contacts.count).map((met) => ({ ...met })),
  };
}

/**
 * Returns what a fuzzball meets first, flying from a place along a heading
 * no farther than `limit`, found by sweeping every brick of the wall in play
 * in each of cast()'s moves.
 */
export function castByScan(
  field: RandomField,
  x: number,
  y: number,
  dx: number,
  dy: number,
  limit: number,
): Cast {
  const found: Met[] = [];
  for (let start = 0; start < limit; start += STEP) {
    const earliest = Math.min(...found.map((contact) => contact.distance));
    if (start > earliest + AT_ONCE) {
      break;
    }
    const along = Math.min(STEP, limit - start);
    const step: Step = {
      x: x + dx * start,
      y: y + dy * start,
      dx: dx * along,
      dy: dy * along,
      r: RADIUS,
      start,
      along,
    };
    found.push(...foundIn(field, step));
  }
  if (found.length === 0) {
    return { distance: limit, x: x + dx * limit, y: y + dy * limit, met: [] };
  }
  const distance = Math.min(...found.map((contact) => contact.distance));
  const met: Met[] = [];
  for (const contact of found) {
    const once =
      contact.distance <= distance + AT_ONCE &&
      !met.some(
        (other) =>
          other.what === contact.what &&
          other.cell === contact.cell &&
          other.side === contact.side,
      );
    if (once) {
      met.push(contact);
    }
  }
  met.sort(
    (a, b) =>
      ORDER.indexOf(a.what) - ORDER.indexOf(b.what) ||
      a.cell - b.cell ||
      a.side - b.side,
  );
  return { distance, x: x + dx * distance, y: y + dy * distance, met };
}

/** The kinds of contact in the order `Contact` names them. */
const ORDER: readonly Contact[] = [
  "side",
  "ceiling",
  "floor",
  "face",
  "corner",
  "bumper",
];

/** Returns everything a move meets: the field's sides and every brick in play. */
function foundIn(field: RandomField, step: Step): Met[] {
  const { wall, depth } = field;
  const sides: [Box, Face, Contact][] = [
    [
      { left: -Infinity, top: -Infinity, right: 0, bottom: Infinity },
      RIGHT,
      "side",
    ],
    [
      { left: COLUMNS, top: -Infinity, right: Infinity, bottom: Infinity },
      LEFT,
      "side",
    ],
    [
      { left: -Infinity, top: depth, right: Infinity, bottom: Infinity },
      FLOORWARD,
      "ceiling",
    ],
    [
      { left: -Infinity, top: -Infinity, right: Infinity, bottom: 0 },
      CEILINGWARD,
      "floor",
    ],
  ];
  const found = sides.flatMap(([box, face, what]) =>
    faceFound(step, box, face, what, -1),
  );
  wall.bricks.forEach((brick, cell) => {
    const column = columnOf(cell);
    const row = fieldRowOf(wall, cell);
    if (brick !== null && row >= 0 && row < depth) {
      found.push(...brickFound(field, step, brick, column, row, cell));
    }
  });
  return found;
}

/** Returns what a move meets of a brick in a field cell. */
function brickFound(
  field: RandomField,
  step: Step,
  brick: Brick,
  column: number,
  row: number,
  cell: number,
): Met[] {
  const kind = field.kinds[brick.kind];
  const shape = shapeOf(kind);
  if (shape === "open") {
    return [];
  }
  if (shape === "round") {
    const t = sweepPoint(step, column + 0.5, row + 0.5, reachOf(kind));
    return pointFound(step, column + 0.5, row + 0.5, t, "bumper", cell, 0);
  }
  const box = brickBox(column, row, { left: 0, top: 0, right: 0, bottom: 0 });
  const exposure = exposureOf(boxesOf(field), column, row);
  const faces = FACES.filter((face) => (exposure & face) !== 0).flatMap(
    (face) => faceFound(step, box, face, "face", cell),
  );
  const corners = CORNERS.filter((corner) => (exposure & corner) !== 0).flatMap(
    (corner) => {
      const at = CORNER_AT[corner];
      const t = sweepCorner(step, box, corner);
      return pointFound(step, box[at.x], box[at.y], t, "corner", cell, corner);
    },
  );
  return [...faces, ...corners];
}

/** Returns a face a move meets, if it does. */
function faceFound(
  step: Step,
  box: Readonly<Box>,
  face: Face,
  what: Contact,
  cell: number,
): Met[] {
  const t = sweepFace(step, box, face);
  if (t === MISSED) {
    return [];
  }
  const { x: nx, y: ny } = FACE_NORMAL[face];
  return [{ what, cell, side: face, nx, ny, distance: distanceOf(step, t) }];
}

/** Returns a point a move comes within reach of, a share `t` through it, if it does. */
function pointFound(
  step: Step,
  px: number,
  py: number,
  t: number,
  what: Contact,
  cell: number,
  side: number,
): Met[] {
  if (t === MISSED) {
    return [];
  }
  const ox = step.x + step.dx * t - px;
  const oy = step.y + step.dy * t - py;
  const length = Math.sqrt(ox * ox + oy * oy);
  return [
    {
      what,
      cell,
      side,
      nx: ox / length,
      ny: oy / length,
      distance: distanceOf(step, t),
    },
  ];
}

/** Returns how far into a cast a share `t` through one of its moves lies. */
function distanceOf(step: Step, t: number): number {
  return step.start + t * step.along;
}

/** Returns which cells of a field hold a box: beyond a side wall, and where a brick in play is of a kind whose shape is a box. */
function boxesOf({ wall, depth, kinds }: RandomField): Solid {
  return (column, row) => {
    if (column < 0 || column >= COLUMNS) {
      return true;
    }
    const brick = brickAt(wall, depth, column, row);
    return brick !== null && shapeOf(kinds[brick.kind]) === "box";
  };
}

/** Returns how near a fuzzball's middle comes to a round kind's middle as it meets it: its radius and the kind's kicking disc's. */
function reachOf(kind: BrickKind): number {
  let reach = RADIUS;
  for (const trait of kind.traits) {
    if (trait.kind === "kicks") {
      reach += trait.radius;
    }
  }
  return reach;
}

/**
 * Returns a field drawn from a source of numbers: 11 to 22 deep, holding a
 * wall of up to 24 rows, some waiting over the ceiling, filled to a share
 * drawn too, its bricks of every kind of `kinds`, the stand-ins' bumper and
 * portal by default.
 */
export function randomField(
  random: () => number,
  kinds: BrickKinds = STAND_INS,
): RandomField {
  const depth = whole(random, LEAST_DEPTH, MOST_DEPTH);
  const rows = whole(random, 1, 24);
  const fill = random();
  const bricks = Array.from({ length: rows * COLUMNS }, (): Brick | null =>
    random() < fill
      ? {
          kind: BRICK_KIND_IDS[whole(random, 0, BRICK_KIND_IDS.length - 1)]!,
          hits: 1,
          full: 1,
          plates: 0,
          tint: 0,
          twin: null,
        }
      : null,
  );
  const wall: Wall = { bricks, rows, lowestRow: whole(random, 1, depth) };
  return { wall, depth, kinds };
}

/** The headings along the field's axes: up, down, right and left. */
const AXES = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
] as const;

/**
 * Returns a shot through a field drawn from a source of numbers: a fuzzball
 * on the floor, or in the field clear of every brick, on a quarter of a
 * unit one time in three, so it often touches a face, a seam or a corner;
 * heading along an axis one time in four, else along an aim, turned down
 * or back half the time; as far as up to 30 units, a whole number of them
 * one time in four, and less than one another time in four.
 */
export function randomShot(
  field: RandomField,
  random: () => number,
): RandomCast {
  const [x, y] = placeIn(field, random);
  const [aimX, aimY] = AIMS[whole(random, 0, AIMS.length - 1)]!;
  const [dx, dy] =
    random() < 0.25
      ? AXES[whole(random, 0, AXES.length - 1)]!
      : [random() < 0.5 ? aimX : -aimX, random() < 0.5 ? aimY : -aimY];
  return { field, x, y, dx, dy, limit: limitOf(random) };
}

/** Returns a cast's limit, drawn from a source: a whole number of units up to 30, less than one, or any length up to 30. */
function limitOf(random: () => number): number {
  const draw = random();
  if (draw < 0.25) {
    return whole(random, 1, 30);
  }
  return (draw < 0.5 ? 1 : 30) * (1 - random());
}

/** Returns a whole number from `least` to `most`, drawn from a source. */
function whole(random: () => number, least: number, most: number): number {
  return least + Math.floor(random() * (most - least + 1));
}

/** Returns a place for a fuzzball in a field, on its floor or clear of every brick, drawn from a source. */
function placeIn(field: RandomField, random: () => number): [number, number] {
  if (random() < 0.25) {
    return [RADIUS + random() * (COLUMNS - 2 * RADIUS), RADIUS];
  }
  const snapped = random() < 1 / 3;
  for (;;) {
    let x = RADIUS + random() * (COLUMNS - 2 * RADIUS);
    let y = RADIUS + random() * (field.depth - 2 * RADIUS);
    if (snapped) {
      x = Math.round(x * 4) / 4;
      y = Math.round(y * 4) / 4;
    }
    if (isClear(field, x, y)) {
      return [x, y];
    }
  }
}

/** Returns whether a fuzzball's middle at a place is no nearer any brick in play than it may come. */
function isClear(field: RandomField, x: number, y: number): boolean {
  const { wall, depth, kinds } = field;
  return wall.bricks.every((brick, cell) => {
    const column = columnOf(cell);
    const row = fieldRowOf(wall, cell);
    if (brick === null || row < 0 || row >= depth) {
      return true;
    }
    const kind = kinds[brick.kind];
    switch (shapeOf(kind)) {
      case "open":
        return true;
      case "round":
        return Math.hypot(x - column - 0.5, y - row - 0.5) >= reachOf(kind);
      case "box": {
        const nearX = Math.min(Math.max(x, column), column + 1);
        const nearY = Math.min(Math.max(y, row), row + 1);
        return Math.hypot(x - nearX, y - nearY) >= RADIUS;
      }
    }
  });
}
