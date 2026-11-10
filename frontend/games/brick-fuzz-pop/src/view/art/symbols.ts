// What the bricks' art is laid out by: a brick's cell at a scale, whether a
// scale draws the finest detail, an outline whose edges lie on whole device
// pixels, a die's pips, and a line drawn as a band. The art's numbers
// are the design's (`docs/brick-fuzz-pop/art/make-art.mjs`), each written as
// a share of the cell its 100-unit square is.

import {
  type Area,
  type ArtFrame,
  type ArtScale,
  type CircleCommand,
  type DrawCommand,
  type FillStyle,
  type LineStyle,
  type Point,
  type PolygonCommand,
  type RoundRectCommand,
  ORIGIN,
  circle,
  inset,
  outlineRoundRect,
} from "@fz/phaser/shapes";
import type { FrameName } from "./frames";

/** How many CSS pixels a unit is, at least, where a brick shows its finest detail: its cracks and steel's rivets. */
const DETAIL_CSS = 30;

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

/**
 * Returns the item at a place in a list made once, such as a tile's frame
 * by its tint, so finding it makes nothing.
 *
 * @throws {RangeError} for a place the list hasn't.
 */
export function itemAt<T>(items: readonly T[], at: number): T {
  const item = items[at];
  if (item === undefined) {
    throw new RangeError(`Nothing at ${String(at)}`);
  }
  return item;
}

/**
 * Returns the edge a band a width wide is drawn about, near an area's own,
 * so that both of the band's edges lie on whole device pixels and neither
 * blurs: the band's outer edges, half the width out, each moved in to the
 * nearest whole pixel, so the band reaches no further than it would have,
 * and a band about an area centred in its cell stays centred.
 */
export function crispEdge(area: Area, width: number): Area {
  const half = width / 2;
  const left = Math.ceil(area.x - half);
  const top = Math.ceil(area.y - half);
  return inset(
    {
      x: left,
      y: top,
      width: Math.floor(area.x + area.width + half) - left,
      height: Math.floor(area.y + area.height + half) - top,
    },
    half,
  );
}

/**
 * Returns a rounded rectangle's outline, a band a line wide about its edge
 * as `outlineRoundRect()` draws it, about its {@link crispEdge}, so both of
 * the band's edges lie on whole device pixels.
 */
export function crispOutline(
  area: Area,
  radius: number,
  style: LineStyle,
): PolygonCommand | RoundRectCommand {
  return outlineRoundRect(crispEdge(area, style.width), radius, style);
}

/** Where a die's pips sit for each count of them from 1, in steps from its middle, across and down. */
const DIE: readonly (readonly (readonly [number, number])[])[] = [
  [[0, 0]],
  [
    [1, -1],
    [-1, 1],
  ],
  [
    [1, -1],
    [0, 0],
    [-1, 1],
  ],
  [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ],
  [
    [-1, -1],
    [1, -1],
    [0, 0],
    [-1, 1],
    [1, 1],
  ],
  [
    [-1, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [1, 1],
  ],
];

/**
 * Returns a die's face of pips about a middle, a step apart, as a brick shows
 * the hits it has left.
 *
 * @throws {RangeError} for a count no die's face shows, 1 to 6.
 */
export function diePips(
  count: number,
  middle: Point,
  step: number,
  radius: number,
  style: FillStyle,
): readonly CircleCommand[] {
  const face = DIE[count - 1];
  if (face === undefined) {
    throw new RangeError(`No die's face shows ${String(count)} pips`);
  }
  return face.map(([across, down]) =>
    circle(
      { x: middle.x + across * step, y: middle.y + down * step },
      radius,
      style,
    ),
  );
}

/**
 * Returns the outline of a line through points drawn a width wide, as a
 * polygon's points, its left side then its right side back: its corners
 * mitred and its ends cut square, so a bold zigzag fills as one shape. Its
 * first end is cut along a way given instead, where one is, such as along
 * the edge it starts on.
 *
 * @throws {RangeError} for a line of fewer than two points, or a first cut
 *   along the line's first leg, which would never meet its sides.
 */
export function bandAlong(
  points: readonly Point[],
  width: number,
  firstCut?: Point,
): readonly Point[] {
  const legs = points.flatMap((from, i) =>
    points.slice(i + 1, i + 2).map((to) => towards(from, to)),
  );
  const first = legs[0];
  const last = legs.at(-1);
  if (first === undefined || last === undefined) {
    throw new RangeError("A band needs two points or more");
  }
  if (firstCut !== undefined && firstCut.x * first.y === firstCut.y * first.x) {
    throw new RangeError("A band's first end can't be cut along its line");
  }
  const half = width / 2;
  const sides = points.map((point, i) => {
    // An end's corner is square, as if its leg ran on past it.
    const before = legs[i - 1] ?? first;
    const after = legs[i] ?? last;
    // Each point's cut runs square to `along`: across the corner, its
    // mitre, or square to the line or along the way given at an end. Which
    // way `along` points makes no odds, as `reach` turns with it.
    const along =
      i === 0 && firstCut !== undefined
        ? towards(ORIGIN, { x: firstCut.y, y: -firstCut.x })
        : towards(ORIGIN, { x: before.x + after.x, y: before.y + after.y });
    // The longer, the sharper the corner or the more aslant the cut.
    const reach = half / (along.x * after.x + along.y * after.y);
    return {
      left: { x: point.x - along.y * reach, y: point.y + along.x * reach },
      right: { x: point.x + along.y * reach, y: point.y - along.x * reach },
    };
  });
  return [
    ...sides.map(({ left }) => left),
    ...sides.map(({ right }) => right).reverse(),
  ];
}

/** Returns the way from a point to another, a unit long. */
function towards(from: Point, to: Point): Point {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  return { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
}
