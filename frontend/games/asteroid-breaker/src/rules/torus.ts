// The field wraps at every edge, so it is a torus: what leaves by one edge
// comes in by the other, and the way from one place to another is the
// shortest across the edges. Those the physics calls thousands of times a
// step take a place's coordinates one by one.

import { FIELD_LONGEST_SIDE, FIELD_SHORT_SIDE } from "./tuning";

/** Describes the field's size, in units. */
export interface Torus {
  readonly width: number;
  readonly height: number;
}

/** Describes a place on the field, in units. */
export interface Place {
  readonly x: number;
  readonly y: number;
}

/** Describes a place on the field that moves, changed in place. */
export interface Moving {
  x: number;
  y: number;
}

/**
 * Returns the field for a room of a shape, its sides in any unit: its short
 * side {@link FIELD_SHORT_SIDE} units, and its long side as many as the
 * shape holds at that unit, up to {@link FIELD_LONGEST_SIDE}.
 *
 * @throws {RangeError} When a side isn't a finite number above 0.
 */
export function torusFor(width: number, height: number): Torus {
  for (const side of [width, height]) {
    if (!(Number.isFinite(side) && side > 0)) {
      throw new RangeError(
        `A field's side must be a finite number above 0, not ${side}.`,
      );
    }
  }
  const long = Math.min(
    FIELD_LONGEST_SIDE,
    (FIELD_SHORT_SIDE * Math.max(width, height)) / Math.min(width, height),
  );
  return width >= height
    ? { width: long, height: FIELD_SHORT_SIDE }
    : { width: FIELD_SHORT_SIDE, height: long };
}

/** Returns the middle of a field, where a wave's first ship waits. */
export function middleOf(torus: Torus): Place {
  return { x: torus.width / 2, y: torus.height / 2 };
}

/** Returns a coordinate wrapped onto an axis of a length, from 0 to under the length. */
export function wrap(at: number, length: number): number {
  if (at >= 0 && at < length) return at;
  const wrapped = at % length;
  if (wrapped >= 0) return wrapped;
  // A step just short of 0 wraps to the length itself, once rounded.
  return wrapped + length < length ? wrapped + length : 0;
}

/**
 * Returns the shortest way along an axis of a length from one coordinate to
 * another, across the wrap or not: from minus half the length to half it.
 */
export function across(from: number, to: number, length: number): number {
  let way = to - from;
  // Only a place lengths off the axis needs the remainder, which is slow on
  // floats, and places on it are what the physics measures a step.
  if (way > length || way < -length) way %= length;
  if (way > length / 2) return way - length;
  if (way < -length / 2) return way + length;
  return way;
}

/** Returns the square of the shortest distance between two places on the field. */
export function distanceSquared(
  torus: Torus,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): number {
  const x = across(fromX, toX, torus.width);
  const y = across(fromY, toY, torus.height);
  return x * x + y * y;
}

/** Returns the shortest distance between two places on the field. */
export function distance(
  torus: Torus,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): number {
  return Math.sqrt(distanceSquared(torus, fromX, fromY, toX, toY));
}

/**
 * Moves a place a length toward another the shortest way across the wrap,
 * if it is within a reach of it, never past it, and returns whether it did.
 */
export function pullToward(
  moving: Moving,
  to: Place,
  reach: number,
  length: number,
  torus: Torus,
): boolean {
  const wayX = across(moving.x, to.x, torus.width);
  const wayY = across(moving.y, to.y, torus.height);
  if (Math.hypot(wayX, wayY) > reach) return false;
  moveAlong(moving, wayX, wayY, length);
  moving.x = wrap(moving.x, torus.width);
  moving.y = wrap(moving.y, torus.height);
  return true;
}

/** Moves a place a length along a way, of any length, never past its end, without wrapping. */
export function moveAlong(
  moving: Moving,
  wayX: number,
  wayY: number,
  length: number,
): void {
  const way = Math.hypot(wayX, wayY);
  const share = way > 0 ? Math.min(length / way, 1) : 0;
  moving.x += wayX * share;
  moving.y += wayY * share;
}

/**
 * Returns where on an axis an object reaching past an edge needs a copy
 * drawn, in lengths from where it is: 1 for a copy a length on, −1 a length
 * back, and 0 for none.
 *
 * An object needs one copy for each axis it reaches past an edge of, and
 * one more at the corner when it reaches past both: one to four drawn in
 * all. Its place is on the axis or within its reach of it, as one drawn
 * between two steps across the wrap may be, and its reach is less than half
 * the length.
 */
export function copyShift(
  at: number,
  reach: number,
  length: number,
): -1 | 0 | 1 {
  if (at < reach) return 1;
  if (at > length - reach) return -1;
  return 0;
}

/**
 * Returns how far off a thing at a place on the field, reaching so far, has
 * its copies past the edges drawn, written into a record the caller keeps:
 * across, `x`, and down, `y`, each 0 where it reaches past no edge that way,
 * and both off for its copy at the corner where it reaches past two.
 */
export function copyOffsets(
  x: number,
  y: number,
  reach: number,
  torus: Torus,
  into: Moving,
): Moving {
  into.x = copyShift(x, reach, torus.width) * torus.width;
  into.y = copyShift(y, reach, torus.height) * torus.height;
  return into;
}
