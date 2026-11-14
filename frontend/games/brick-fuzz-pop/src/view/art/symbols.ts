// What the bricks' art is laid out by: a brick's cell at a scale, whether a
// scale draws the finest detail, a crack's width and the ways along a tile's
// edges, an eighth of a turn and the lightning bolt a brick is marked with;
// and, from `@fz/phaser/shapes`, the geometry it shares with Brick Breaker's
// art, under the names its kinds take it by: a point at shares of an area, an
// outline whose edges lie on whole device pixels, a die's pips, a point
// turned, a diamond and a line drawn as a band. The art's numbers are the
// design's (`docs/archive/brick-fuzz-pop/art/make-art.mjs`), each written as
// a share of the cell its 100-unit square is.

import {
  type Area,
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  type FillStyle,
  type Point,
  type PolygonCommand,
  placed,
  polygon,
} from "@fz/phaser/shapes";
import type { FrameName } from "./frames";

export {
  bandAlong,
  crispEdge,
  crispOutline,
  diamond,
  diePips,
  pointAt,
  turned,
} from "@fz/phaser/shapes";

/** How many CSS pixels a unit is, at least, where a brick shows its finest detail: its cracks, steel's rivets and the bomb's dots. */
const DETAIL_CSS = 30;

/** How wide a crack is, in field units: a tough brick's, or a cage's. */
export const CRACK_WIDTH = 0.032;

/** The cosine and the sine of an eighth of a turn. */
export const EIGHTH = Math.SQRT1_2;

/** The way along a tile's top or bottom edge, which a crack from it is cut along. */
export const ACROSS: Point = { x: 1, y: 0 };

/** The way along a tile's left or right edge, which a crack from it is cut along. */
export const DOWN: Point = { x: 0, y: 1 };

/** Returns whether a scale draws a brick's finest detail, at a unit of {@link DETAIL_CSS} CSS pixels or more. */
export function detailed(scale: ArtScale): boolean {
  return scale.unit / scale.pixelRatio >= DETAIL_CSS;
}

/**
 * Returns a brick's cell at a scale, which each of its frames fills, so its
 * frames stack: a unit square, in whole device pixels, one at least.
 */
export function cellOf(scale: ArtScale): Area {
  const side = Math.max(1, Math.round(scale.unit));
  return { x: 0, y: 0, width: side, height: side };
}

/** Returns a frame the size of a brick's cell, drawn in it. */
export function cellFrame(
  name: FrameName,
  scale: ArtScale,
  draw: (cell: Area) => readonly DrawCommand[],
): ArtFrame {
  const cell = cellOf(scale);
  return { name, width: cell.width, height: cell.height, commands: draw(cell) };
}

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
