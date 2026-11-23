// A fuzzball flown through a field by cast() alone, for the property specs
// to hold its moves to the walls, the bricks and its aim's headings: turned
// as C3 turns it, through the portals and held by the hatches, with the
// solid shape of each brick standing as it flies each move, and how near a
// move comes to one.

import { COLUMNS, RADIUS } from "@fz/brick-wall/rules/field";
import { columnOf, wallRowOf } from "@fz/brick-wall/rules/grid";
import { type KindId, kindOf } from "../rules/catalog/kinds";
import {
  type CastField,
  cast,
  castField,
  clearBrick,
  createContacts,
  openHatches,
} from "../rules/flight/cast";
import { type Face, SHAPE, facesOf } from "../rules/flight/faces";
import { FLIGHT_RULES } from "../rules/tuning";
import {
  type Cast,
  type RandomField,
  castByScan,
  castOf,
} from "./cast_reference";

/** A point of the field, across and up. */
export type Point = readonly [number, number];

/** Describes a move of a flight: where its middle flew from and to, along a heading, with the solid shapes of the bricks standing as it flew. */
export interface Leg {
  readonly from: Point;
  readonly to: Point;
  readonly heading: Point;
  readonly solids: readonly (readonly Point[])[];
}

/** Describes a flight flown by cast(): its field's depth, its aim's heading, its moves, and what each cast and its scan met. */
export interface Flight {
  readonly depth: number;
  readonly aim: Point;
  readonly legs: readonly Leg[];
  readonly casts: readonly Cast[];
  readonly scans: readonly Cast[];
}

/** Returns each brick's solid shape standing in a field, as its corners in turn: a box's, a ramp's and a gem's. */
export function solidsOf({ depth, shapes }: CastField): Point[][] {
  const solids: Point[][] = [];
  for (let row = 0; row < depth; row++) {
    for (let column = 0; column < COLUMNS; column++) {
      const [c, r] = [column, row];
      switch (shapes[row * COLUMNS + column]) {
        case SHAPE.box:
          solids.push([
            [c, r],
            [c + 1, r],
            [c + 1, r + 1],
            [c, r + 1],
          ]);
          break;
        case SHAPE.rampFloorwardLeft:
          solids.push([
            [c, r],
            [c + 1, r],
            [c, r + 1],
          ]);
          break;
        case SHAPE.rampFloorwardRight:
          solids.push([
            [c, r],
            [c + 1, r],
            [c + 1, r + 1],
          ]);
          break;
        case SHAPE.rampCeilingwardLeft:
          solids.push([
            [c, r],
            [c + 1, r + 1],
            [c, r + 1],
          ]);
          break;
        case SHAPE.rampCeilingwardRight:
          solids.push([
            [c + 1, r],
            [c + 1, r + 1],
            [c, r + 1],
          ]);
          break;
        case SHAPE.gem:
          solids.push([
            [c + 0.5, r],
            [c + 1, r + 0.5],
            [c + 0.5, r + 1],
            [c, r + 0.5],
          ]);
          break;
        default:
          // Air, and a hatch or a portal, which a fuzzball flies through.
          break;
      }
    }
  }
  return solids;
}

/**
 * Returns the heading a moment's faces turn a fuzzball to, as C3 turns it:
 * the flats mirror it, then a long 45° face it still flies into swaps its
 * speeds, and a cut swaps them only where nothing else turned it.
 */
export function turnOff(met: readonly Face[], [dx, dy]: Point): Point {
  const flipX = met.some((face) => face.kind === "flat" && face.along === "up");
  const flipY = met.some(
    (face) =>
      face.kind === "floor" ||
      face.kind === "bar" ||
      (face.kind === "flat" && face.along === "across"),
  );
  let heading: Point = [flipX ? -dx : dx, flipY ? -dy : dy];
  let turned = flipX || flipY;
  for (const face of met) {
    if (
      face.kind === "slant" &&
      face.long &&
      face.facingX * heading[0] + face.facingY * heading[1] < 0
    ) {
      heading = swapped(face, heading);
      turned = true;
    }
  }
  const cut = met.find((face) => face.kind === "slant" && !face.long);
  return turned || cut === undefined ? heading : swapped(cut, heading);
}

/** Returns a heading a 45° face turns: its speeds swapped, with the signs that send it away. */
function swapped(face: Face, [dx, dy]: Point): Point {
  return face.kind === "slant" && face.facingX === face.facingY
    ? [-dy, -dx]
    : [dy, dx];
}

/**
 * Returns a flight of a field from a place on its floor along an aim's
 * heading, flown by cast() for as many moves as given: turned off what each meets, through a
 * portal's eye into its twin's, passing the eyes as air until it next
 * turns, striking the bricks it meets, each breaking once struck as often
 * as it has hits unless its kind never breaks, and held by the hatches,
 * which open at their last hold.
 */
export function flownByCast(
  { wall, depth }: RandomField,
  x: number,
  aim: Point,
  moves: number,
): Flight {
  const field = castField(wall, depth);
  const hits = wall.bricks.map((brick) => brick?.hits ?? 0);
  const contacts = createContacts();
  const legs: Leg[] = [];
  const casts: Cast[] = [];
  const scans: Cast[] = [];
  let faces = facesOf(field);
  let solids = solidsOf(field);
  let at: Point = [x, RADIUS];
  let heading = aim;
  let eyes = true;
  let holds = 0;
  for (let move = 0; move < moves; move++) {
    const [dx, dy] = heading;
    cast(field, at[0], at[1], dx, dy, eyes, contacts);
    casts.push(castOf(contacts));
    scans.push(castByScan(faces, at[0], at[1], dx, dy, eyes));
    legs.push({ from: at, to: [contacts.x, contacts.y], heading, solids });
    at = [contacts.x, contacts.y];
    const met = contacts.met.slice(0, contacts.count).map(({ face }) => face);
    const eye = met.find((face): face is Eye => face.kind === "eye");
    const twin = eye === undefined ? null : wall.bricks[eye.owner.cell]?.twin;
    if (eye !== undefined && typeof twin === "number") {
      at = [
        at[0] + columnOf(twin) - columnOf(eye.owner.cell),
        at[1] + wallRowOf(twin) - wallRowOf(eye.owner.cell),
      ];
      eyes = false;
      continue;
    }
    heading = turnOff(met, heading);
    eyes = true;
    let changed = false;
    let held = false;
    for (const cell of struckIn(met)) {
      const brick = wall.bricks[cell];
      const left = (hits[cell] ?? 0) - 1;
      hits[cell] = left;
      if (brick?.kind === "hatch") {
        held = true;
      } else if (
        left === 0 &&
        brick !== null &&
        brick !== undefined &&
        breaks(brick.kind)
      ) {
        clearBrick(field, cell);
        changed = true;
      }
    }
    if (held && ++holds === FLIGHT_RULES.hatchHolds) {
      openHatches(field);
      changed = true;
    }
    if (changed) {
      faces = facesOf(field);
      solids = solidsOf(field);
    }
  }
  return { depth, aim, legs, casts, scans };
}

/** A portal's eye, one of the faces. */
type Eye = Extract<Face, { readonly kind: "eye" }>;

/** Returns the wall cells of the bricks whose faces a moment met, each once. */
function struckIn(met: readonly Face[]): Set<number> {
  return new Set(
    met.flatMap((face) =>
      face.kind !== "floor" && face.owner.kind === "brick"
        ? [face.owner.cell]
        : [],
    ),
  );
}

/** Returns whether a brick of a kind breaks once struck as often as it has hits: every kind but those that never do. */
function breaks(kind: KindId): boolean {
  return !kindOf(kind).traits.some((trait) => trait.kind === "never");
}

/** Returns the squared distance from a point to a segment. */
function toSegment([px, py]: Point, [ax, ay]: Point, [bx, by]: Point): number {
  const [ex, ey] = [bx - ax, by - ay];
  const length = ex * ex + ey * ey;
  const t =
    length === 0
      ? 0
      : Math.min(Math.max(((px - ax) * ex + (py - ay) * ey) / length, 0), 1);
  const [ox, oy] = [ax + t * ex - px, ay + t * ey - py];
  return ox * ox + oy * oy;
}

/** Returns which side of the line from `a` to `b` a point lies: positive left of it, negative right, 0 on it. */
function side([ax, ay]: Point, [bx, by]: Point, [px, py]: Point): number {
  return (bx - ax) * (py - ay) - (by - ay) * (px - ax);
}

/** Returns the squared distance between two segments, 0 where they cross. */
function between(p: Point, q: Point, a: Point, b: Point): number {
  const crosses =
    side(p, q, a) * side(p, q, b) < 0 && side(a, b, p) * side(a, b, q) < 0;
  return crosses
    ? 0
    : Math.min(
        toSegment(p, a, b),
        toSegment(q, a, b),
        toSegment(a, p, q),
        toSegment(b, p, q),
      );
}

/** Returns the squared distance from a segment to a solid shape, 0 where it reaches inside. */
export function clearance(p: Point, q: Point, solid: readonly Point[]): number {
  const edges = solid.map(
    (a, index) => [a, solid[(index + 1) % solid.length]!] as const,
  );
  const inside = edges.every(([a, b]) => side(a, b, p) > 0);
  return inside ? 0 : Math.min(...edges.map(([a, b]) => between(p, q, a, b)));
}
