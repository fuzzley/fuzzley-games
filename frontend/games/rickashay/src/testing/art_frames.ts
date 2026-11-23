import type { ArtScale, Point } from "@fz/phaser/shapes";
import { type PaletteRoles, wallPalette } from "../view/colors/palette";

/**
 * The roles the art's specs draw in, each a color no other role takes:
 * Classic felt's, but for its page, which is its field's white, so a page
 * of its own, Soft pastel's, lets a spec tell the two apart, and for the
 * text on its warning color, white too, so Casino night's. They are written
 * out, which its spec holds to the stylesheet, so a spec that imports them
 * compiles no stylesheet.
 */
export const ART_ROLES: PaletteRoles = {
  field: "#ffffff",
  fieldLine: "#e2e5e9",
  fieldText: "#1b1f24",
  fieldMuted: "#5d6672",
  page: "#f4f1fb",
  accent: "#2f7d4f",
  danger: "#c62828",
  warning: "#a84b06",
  onWarning: "#241204",
};

/** The palette the art's specs draw in, a light one. */
export const ART_PALETTE = wallPalette(ART_ROLES, "light");

/**
 * The device pixels to a CSS pixel the art is drawn at: a plain screen's, a
 * browser zoomed to 125%, and phones' and dense laptops' up to 3.
 */
export const PIXEL_RATIOS: readonly number[] = [1, 1.25, 1.5, 2, 2.625, 3];

/** The scale the art's specs draw at, a unit of 31 CSS pixels at 2 device pixels to one, in full detail. */
export const ART_SCALE: ArtScale = { unit: 62, pixelRatio: 2 };

/**
 * Returns a number to a billionth, so two worked out alike but for a
 * rounding, such as two points round a curve, are equal.
 */
export function billionths(n: number): number {
  // Adding 0 turns -0 into 0, which a deep equality tells apart.
  return Number(n.toFixed(9)) + 0;
}

/** Returns a point to a billionth, as {@link billionths} does a number. */
export function pointInBillionths({ x, y }: Point): Point {
  return { x: billionths(x), y: billionths(y) };
}

/**
 * Returns how far a point lies from the nearest point of a straight line
 * between two others, or from the one where they are the same.
 */
export function distanceToSegment(
  point: Point,
  from: Point,
  to: Point,
): number {
  const across = to.x - from.x;
  const down = to.y - from.y;
  const squared = across * across + down * down;
  if (squared === 0) {
    return Math.hypot(point.x - from.x, point.y - from.y);
  }
  const along = Math.max(
    0,
    Math.min(
      1,
      ((point.x - from.x) * across + (point.y - from.y) * down) / squared,
    ),
  );
  return Math.hypot(
    point.x - (from.x + along * across),
    point.y - (from.y + along * down),
  );
}

/**
 * Returns how far a point lies outside a convex outline whose points run
 * clockwise, as a tile's do, the most it lies past any of its edges: below
 * nothing for a point inside it, by as far as its nearest edge. A point
 * that repeats the one before it makes an edge of no length, which bounds
 * nothing.
 */
export function pastOutline(point: Point, outline: readonly Point[]): number {
  return Math.max(
    ...outline.flatMap((from, i) => {
      const to = outline[(i + 1) % outline.length] ?? from;
      const across = to.x - from.x;
      const down = to.y - from.y;
      const length = Math.hypot(across, down);
      // Clockwise on the canvas, whose y runs down, the outside of an edge
      // lies to its left, the way its line turned a quarter back points.
      return length === 0
        ? []
        : [((point.x - from.x) * down - (point.y - from.y) * across) / length];
    }),
  );
}
