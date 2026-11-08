// The curves a game's art is drawn along, each flattened into points, since
// a frame is baked once and `atlasFrameOf()` draws only straight lines and
// circles.

import type { Point } from "./shapes";

/** How many straight pieces a curve is drawn in. */
const CURVE_PIECES = 8;

/**
 * How many straight pieces a whole turn of an arc is drawn in, and a share of
 * them for a part of one.
 */
const TURN_PIECES = 40;

/**
 * Returns the points along an arc about a middle, from an angle to another,
 * in radians clockwise from the right, both ends among them.
 */
export function arcPoints(
  middle: Point,
  radius: number,
  from: number,
  to: number,
): readonly Point[] {
  const pieces = Math.max(
    1,
    Math.ceil((Math.abs(to - from) / (2 * Math.PI)) * TURN_PIECES),
  );
  return Array.from({ length: pieces + 1 }, (_, i) => {
    const angle = from + ((to - from) * i) / pieces;
    return {
      x: middle.x + Math.cos(angle) * radius,
      y: middle.y + Math.sin(angle) * radius,
    };
  });
}

/**
 * Returns the points around an ellipse about a middle, as far across and
 * down as given, a whole turn of them, the first not repeated.
 */
export function ellipsePoints(
  middle: Point,
  across: number,
  down: number,
): readonly Point[] {
  return Array.from({ length: TURN_PIECES }, (_, i) => {
    const angle = (i / TURN_PIECES) * 2 * Math.PI;
    return {
      x: middle.x + Math.cos(angle) * across,
      y: middle.y + Math.sin(angle) * down,
    };
  });
}

/**
 * Returns the points along a quadratic curve, past its start to its end, so
 * curves in turn join without a point twice.
 */
export function quadraticPoints(
  from: Point,
  control: Point,
  to: Point,
): readonly Point[] {
  return Array.from({ length: CURVE_PIECES }, (_, i) => {
    const t = (i + 1) / CURVE_PIECES;
    const u = 1 - t;
    return {
      x: u * u * from.x + 2 * u * t * control.x + t * t * to.x,
      y: u * u * from.y + 2 * u * t * control.y + t * t * to.y,
    };
  });
}

/**
 * Returns the points along a cubic curve, past its start to its end, as
 * {@link quadraticPoints} does.
 */
export function cubicPoints(
  from: Point,
  first: Point,
  second: Point,
  to: Point,
): readonly Point[] {
  return Array.from({ length: CURVE_PIECES }, (_, i) => {
    const t = (i + 1) / CURVE_PIECES;
    const u = 1 - t;
    const a = u * u * u;
    const b = 3 * u * u * t;
    const c = 3 * u * t * t;
    const d = t * t * t;
    return {
      x: a * from.x + b * first.x + c * second.x + d * to.x,
      y: a * from.y + b * first.y + c * second.y + d * to.y,
    };
  });
}
