// The small builders a symbol is drawn with in a square, such as a pickup's
// or a capsule's, its places and sizes given as shares of the square.

import {
  type Area,
  type CircleCommand,
  type FillStyle,
  type LineStyle,
  type Point,
  type RingCommand,
  circle,
  ring,
} from "./shapes";

/** How wide a symbol's lines are, as a share of its square's side. */
const SYMBOL_LINE = 0.14;

/** The middle of a square, in shares of it. */
const MIDDLE: Point = { x: 0.5, y: 0.5 };

/**
 * Returns the style a symbol's lines are drawn in, in a square: a share of
 * its side wide, and the style's own width at least.
 */
export function symbolLineStyle(square: Area, style: LineStyle): LineStyle {
  return {
    color: style.color,
    width: Math.max(style.width, square.width * SYMBOL_LINE),
  };
}

/**
 * Returns a filled circle anywhere in a square, at shares of it across and
 * down, its radius a share of the square's width; {@link discIn} is one at
 * its middle.
 */
export function dotIn(
  square: Area,
  at: Point,
  radius: number,
  style: FillStyle,
): CircleCommand {
  return circle(pointIn(square, at), radius * square.width, style);
}

/** Returns a filled circle about a square's middle, its radius a share of the square's width. */
export function discIn(
  square: Area,
  radius: number,
  style: FillStyle,
): CircleCommand {
  return dotIn(square, MIDDLE, radius, style);
}

/** Returns a circle's outline about a square's middle, its radius a share of the square's width. */
export function rimIn(
  square: Area,
  radius: number,
  style: LineStyle,
): RingCommand {
  return ring(pointIn(square, MIDDLE), radius * square.width, style);
}

/** Returns the point at a place in a square, given in shares of it across and down. */
function pointIn(square: Area, at: Point): Point {
  return {
    x: square.x + at.x * square.width,
    y: square.y + at.y * square.height,
  };
}
