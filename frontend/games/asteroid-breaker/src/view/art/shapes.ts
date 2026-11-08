// Asteroid Breaker's own helpers for its art, over `@fz/phaser/shapes`: the
// scale its atlas is baked at, the outline it draws around a piece, and the
// dashed rings and grown outlines its frames are built from.

import { clamp } from "@fz/core/math";
import {
  type ArtScale,
  type DrawCommand,
  type LineStyle,
  ORIGIN,
  type Point,
  arcPoints,
  stroke,
  widthOf,
} from "@fz/phaser/shapes";
import { wholePixels } from "../field/field_metrics";

/**
 * The most device pixels a field unit is baked at; the scene scales the
 * art up past it, so the largest window's atlas still fits a texture every
 * device takes.
 */
export const MOST_BAKED_UNIT = 32;

/**
 * How wide the outline around a rock, the ship, a pickup or the comet is, in
 * field units, where that is more than a CSS pixel.
 */
const OUTLINE = 0.12;

/**
 * The widest a line or an outline gets, in field units: at the 6 CSS px a
 * unit the layout check holds a field to, at any pixel ratio, whether or
 * not the bake rounds the unit down to a whole device pixel, 2 device
 * pixels on 6 or more, or 3 on 12 or more.
 */
export const MOST_LINE = 1 / 3;

/** How far an outline's corner may reach out, against its width, so a sharp corner can't spike. */
export const MOST_MITER = 2;

/**
 * Returns the scale the atlas is baked at for a field: its unit rounded down
 * to a whole device pixel, one at least and {@link MOST_BAKED_UNIT} at most,
 * at its pixel ratio.
 *
 * The scene zooms the art the rest of the way, so a window dragged to
 * another size bakes the atlas again only as its unit passes a whole device
 * pixel, not at every frame of the drag.
 */
export function bakedScale(scale: ArtScale): ArtScale {
  return {
    unit: clamp(wholePixels(scale.unit), 1, MOST_BAKED_UNIT),
    pixelRatio: scale.pixelRatio,
  };
}

/** Returns how wide an outline is, in whole device pixels: a CSS pixel at least. */
export function outlineWidth(scale: ArtScale): number {
  return widthOf(OUTLINE, scale);
}

/**
 * Returns a ring about the origin drawn as dashes, each an arc, as many as fit
 * a dash and a gap apart.
 */
export function dashedRing(
  radius: number,
  dash: { readonly dash: number; readonly gap: number },
  style: LineStyle,
): readonly DrawCommand[] {
  const count = Math.max(
    1,
    Math.round((2 * Math.PI * radius) / (dash.dash + dash.gap)),
  );
  return Array.from({ length: count }, (_, i) => {
    const from = (i / count) * 2 * Math.PI;
    return stroke(
      arcPoints(ORIGIN, radius, from, from + dash.dash / radius),
      style,
    );
  }).flat();
}

/**
 * Returns a closed outline grown outward by a width, each corner moved out
 * along its two sides' normals, so a shape filled in it and then in the
 * outline itself shows a band that wide around it.
 */
export function outward(
  points: readonly Point[],
  by: number,
): readonly Point[] {
  // Which way the points run decides which side of each edge is out.
  const turn = Math.sign(signedArea(points)) || 1;
  return points.map((point, i) => {
    const before = normalOf(points.at(i - 1) ?? point, point, turn);
    const after = normalOf(
      point,
      points[(i + 1) % points.length] ?? point,
      turn,
    );
    const x = before.x + after.x;
    const y = before.y + after.y;
    const length = Math.hypot(x, y) || 1;
    const along = Math.max(
      (x * before.x + y * before.y) / length,
      1 / MOST_MITER,
    );
    return {
      x: point.x + (x / length) * (by / along),
      y: point.y + (y / length) * (by / along),
    };
  });
}

/**
 * Returns twice the area a closed outline holds, above nothing where its points
 * run clockwise on the screen.
 */
function signedArea(points: readonly Point[]): number {
  let sum = 0;
  points.forEach((point, i) => {
    const next = points[(i + 1) % points.length] ?? point;
    sum += point.x * next.y - next.x * point.y;
  });
  return sum;
}

/**
 * Returns the unit normal of an edge on its outer side, for an outline whose
 * points turn as `turn` says.
 */
function normalOf(from: Point, to: Point, turn: number): Point {
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  return {
    x: (turn * (to.y - from.y)) / length,
    y: (turn * (from.x - to.x)) / length,
  };
}
