// What the bricks' art is laid out by, beside the cell
// `@fz/brick-wall/view/art` lays a brick's frames in: a crack's width and the
// ways along a tile's edges, an eighth of a turn and the lightning bolt a
// brick is marked with; and, from `@fz/phaser/shapes`, the geometry it
// shares with Brick Breaker's art, under the names its kinds take it by: a
// point at shares of an area, an outline whose edges lie on whole device
// pixels, a die's pips, a point turned, a diamond and a line drawn as a band.
// The art's numbers are the design's
// (`docs/archive/brick-fuzz-pop/art/make-art.mjs`), each written as a share
// of the cell its 100-unit square is.

import {
  type FillStyle,
  type Point,
  type PolygonCommand,
  placed,
  polygon,
} from "@fz/phaser/shapes";

export {
  bandAlong,
  crispEdge,
  crispOutline,
  diamond,
  diePips,
  pointAt,
  turned,
} from "@fz/phaser/shapes";

/** How wide a crack is, in field units: a tough brick's, or a cage's. */
export const CRACK_WIDTH = 0.032;

/** The cosine and the sine of an eighth of a turn. */
export const EIGHTH = Math.SQRT1_2;

/** The way along a tile's top or bottom edge, which a crack from it is cut along. */
export const ACROSS: Point = { x: 1, y: 0 };

/** The way along a tile's left or right edge, which a crack from it is cut along. */
export const DOWN: Point = { x: 0, y: 1 };

/** The lightning bolt a brick is marked with, about its middle, two units tall. */
const BOLT_MARK: readonly Point[] = [
  { x: -0.08, y: -1 },
  { x: 0.5, y: -1 },
  { x: 0.14, y: -0.2 },
  { x: 0.62, y: -0.2 },
  { x: -0.3, y: 1 },
  { x: -0.04, y: 0.12 },
  { x: -0.56, y: 0.12 },
];

/** Returns the lightning bolt a brick is marked with, about a middle, reaching half its height up and down from it. */
export function boltMark(
  middle: Point,
  half: number,
  style: FillStyle,
): PolygonCommand {
  return polygon(placed(BOLT_MARK, half, middle), style);
}
