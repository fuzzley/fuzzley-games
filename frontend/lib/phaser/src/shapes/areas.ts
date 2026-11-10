// What a game's art is laid out by: the areas and points of a frame as shares
// of an area or insets into it, and the outlines, stars and dashes drawn in
// them.

import { arcPoints } from "./curves";
import {
  type Area,
  type DrawCommand,
  type LineStyle,
  type Point,
  type PolygonCommand,
  type RoundRectCommand,
  polygon,
  rect,
  roundRect,
} from "./shapes";

/** Says where a dash of a dashed line runs, from a point to another. */
export interface Dash {
  readonly from: Point;
  readonly to: Point;
}

/** A quarter of a turn, in radians. */
const QUARTER = Math.PI / 2;

/** Returns points given as shares of an area. */
export function within(
  area: Area,
  shares: readonly (readonly [number, number])[],
): readonly Point[] {
  return shares.map(([across, down]) => ({
    x: area.x + across * area.width,
    y: area.y + down * area.height,
  }));
}

/** Returns the part of an area that shares of it give: from a share across and down, a share wide and tall. */
export function share(
  area: Area,
  across: number,
  down: number,
  wide: number,
  tall: number,
): Area {
  return {
    x: area.x + across * area.width,
    y: area.y + down * area.height,
    width: wide * area.width,
    height: tall * area.height,
  };
}

/** Returns an area shrunk by an inset on each side, or grown by a negative one. */
export function inset(area: Area, by: number): Area {
  return {
    x: area.x + by,
    y: area.y + by,
    width: area.width - 2 * by,
    height: area.height - 2 * by,
  };
}

/** Returns a square of a side in the middle of an area. */
export function middleSquare(area: Area, side: number): Area {
  return {
    x: area.x + (area.width - side) / 2,
    y: area.y + (area.height - side) / 2,
    width: side,
    height: side,
  };
}

/** Returns the four bars of a frame around the inside of an area, its style's width thick. */
export function frameAround(
  area: Area,
  style: LineStyle,
): readonly DrawCommand[] {
  const { x, y } = area;
  const { width } = style;
  const right = x + area.width - width;
  const bottom = y + area.height - width;
  return [
    rect({ x, y, width: area.width, height: width }, style),
    rect({ x, y: bottom, width: area.width, height: width }, style),
    rect({ x, y, width, height: area.height }, style),
    rect({ x: right, y, width, height: area.height }, style),
  ];
}

/**
 * Returns the outline of the rounded rectangle {@link roundRect} fills over
 * an area, its line's middle along the edge, as SVG strokes a `<rect>`,
 * drawn as a band: one polygon, round its outer edge and back round its
 * inner edge.
 *
 * It is filled rather than stroked, so what it covers, and so the size of
 * its frame, hangs on no renderer's joins, and in one polygon, so no seam
 * shows where two would meet. Its corners are square where the radius is
 * nothing, as a mitred join's are. A line as wide as the area's shorter
 * side, or wider, leaves no hole, so it fills the rounded rectangle it
 * reaches over instead.
 *
 * It is meant for a frame baked into an atlas, which a 2D canvas fills: a
 * WebGL `Graphics` first drops each point of a path that lies within
 * `render.pathDetailThreshold` of the one before, a pixel unless a game sets
 * it to 0, which can cut across the band where its edges are joined.
 */
export function outlineRoundRect(
  area: Area,
  radius: number,
  style: LineStyle,
): PolygonCommand | RoundRectCommand {
  const edge = roundRect(area, radius, style);
  const half = style.width / 2;
  const outside = inset(edge, -half);
  const outsideRadius = edge.radius > 0 ? edge.radius + half : 0;
  if (style.width >= Math.min(edge.width, edge.height)) {
    return roundRect(outside, outsideRadius, style);
  }
  const inside = edgeRing(inset(edge, half), Math.max(0, edge.radius - half));
  // The inner edge runs the other way, so the hole it rings is left empty,
  // and the two lines between the edges, one each way, add nothing.
  return polygon(
    [...edgeRing(outside, outsideRadius), ...[...inside].reverse()],
    style,
  );
}

/**
 * Returns the points round a rounded rectangle's edge, clockwise from the
 * top of its left side, back to where they started.
 */
function edgeRing(area: Area, radius: number): readonly Point[] {
  // The corners' middles lie a radius in from each side.
  const left = area.x + radius;
  const top = area.y + radius;
  const right = area.x + area.width - radius;
  const bottom = area.y + area.height - radius;
  // A corner's arc about its middle, from a number of quarter turns
  // clockwise from the right to the next.
  const corner = (x: number, y: number, quarters: number): readonly Point[] =>
    arcPoints({ x, y }, radius, quarters * QUARTER, (quarters + 1) * QUARTER);
  const points = [
    ...corner(left, top, 2),
    ...corner(right, top, 3),
    ...corner(right, bottom, 0),
    ...corner(left, bottom, 1),
  ];
  return [...points, ...points.slice(0, 1)];
}

/** Returns the points of a star around a middle, its first point straight up. */
export function star(
  middle: Point,
  outer: number,
  inner: number,
  points: number,
): readonly Point[] {
  return Array.from({ length: points * 2 }, (_, i) => {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const radius = i % 2 === 0 ? outer : inner;
    return {
      x: middle.x + Math.cos(angle) * radius,
      y: middle.y + Math.sin(angle) * radius,
    };
  });
}

/**
 * Returns the dashes of a straight line from a point to another, each a
 * dash long and a gap apart, as many as fit with a gap clear of each end at
 * least, the room left over shared between the ends.
 *
 * A dash of no length draws none, and a gap below nothing is none.
 */
export function dashes(
  from: Point,
  to: Point,
  dash: number,
  gap: number,
): readonly Dash[] {
  if (dash <= 0) return [];
  const space = Math.max(0, gap);
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const count = Math.max(0, Math.floor((length - space) / (dash + space)));
  const start = (length - count * (dash + space) + space) / 2;
  const along = (distance: number): Point => ({
    x: from.x + ((to.x - from.x) * distance) / length,
    y: from.y + ((to.y - from.y) * distance) / length,
  });
  return Array.from({ length: count }, (_, i) => {
    const begin = start + i * (dash + space);
    return { from: along(begin), to: along(begin + dash) };
  });
}
