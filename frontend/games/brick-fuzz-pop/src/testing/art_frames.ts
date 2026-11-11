import {
  type Area,
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  type Point,
  inset,
} from "@fz/phaser/shapes";
import { atlasFrames } from "../view/art/atlas_frames";
import { type PaletteRoles, wallPalette } from "../view/colors/palette";

/** The roles the art's specs draw in, each a color no other role takes, as Classic felt's are but the page. */
const ROLES: PaletteRoles = {
  field: "#ffffff",
  fieldLine: "#e2e5e9",
  fieldText: "#1b1f24",
  fieldMuted: "#5d6672",
  page: "#f4f1fb",
  accent: "#2f7d4f",
  danger: "#c62828",
  warning: "#a84b06",
};

/** The palette the art's specs draw in, a light one. */
export const ART_PALETTE = wallPalette(ROLES, "light");

/**
 * The device pixels to a CSS pixel the art is drawn at: a plain screen's, a
 * browser zoomed to 125%, and phones' and dense laptops' up to 3.
 */
export const PIXEL_RATIOS: readonly number[] = [1, 1.25, 1.5, 2, 2.625, 3];

/**
 * Returns every whole unit from 24 CSS pixels, the least the layout check
 * allows, to 128 device pixels, the most the atlas is baked at, at a pixel
 * ratio.
 */
export function everyScale(pixelRatio: number): readonly ArtScale[] {
  const least = Math.ceil(24 * pixelRatio);
  return Array.from({ length: 128 - least + 1 }, (_, i) => ({
    unit: least + i,
    pixelRatio,
  }));
}

/** The scale the art's specs draw at, a unit of 31 CSS pixels at 2 device pixels to one, in full detail. */
export const ART_SCALE: ArtScale = { unit: 62, pixelRatio: 2 };

/**
 * The atlas's frames in the specs' palette, at their scale, among which a
 * spec finds one by its name with `@fz/phaser/testing/pure`'s `frameNamed()`.
 */
export const ART_FRAMES: readonly ArtFrame[] = atlasFrames(
  ART_PALETTE,
  ART_SCALE,
);

/**
 * Returns a number to a billionth, so two worked out alike but for a
 * rounding, such as two points round a curve, are equal.
 */
export function billionths(n: number): number {
  // Adding 0 turns -0 into 0, which a deep equality tells apart.
  return Number(n.toFixed(9)) + 0;
}

/** Returns an area to a billionth of a pixel, as {@link billionths} does a number. */
export function inBillionths(area: Area): Area {
  return {
    x: billionths(area.x),
    y: billionths(area.y),
    width: billionths(area.width),
    height: billionths(area.height),
  };
}

/** Returns how far a point lies from the nearest point of a straight line between two others. */
export function distanceToSegment(
  point: Point,
  from: Point,
  to: Point,
): number {
  const across = to.x - from.x;
  const down = to.y - from.y;
  const along = Math.max(
    0,
    Math.min(
      1,
      ((point.x - from.x) * across + (point.y - from.y) * down) /
        (across * across + down * down),
    ),
  );
  return Math.hypot(
    point.x - (from.x + along * across),
    point.y - (from.y + along * down),
  );
}

/**
 * Returns how far a point lies past the edge of a rectangle with rounded
 * corners: above nothing outside it, and below nothing inside it, as far
 * below as it lies in from the edge.
 */
export function pastRoundRect(
  point: Point,
  area: Area,
  radius: number,
): number {
  const inner = inset(area, radius);
  // How far past the inner rectangle's nearer side the point lies, each
  // way: below nothing between its sides.
  const across = Math.max(inner.x - point.x, point.x - inner.x - inner.width);
  const down = Math.max(inner.y - point.y, point.y - inner.y - inner.height);
  const outside = Math.hypot(Math.max(across, 0), Math.max(down, 0));
  return outside + Math.min(Math.max(across, down), 0) - radius;
}

/**
 * Returns how far a command reaches past the edge of a rectangle with
 * rounded corners, at most: above nothing where it may show outside it, and
 * nothing or below where it lies within it.
 *
 * It is measured from the points a command is drawn about, its line's half
 * width or its radius out from them, so it may say a little more than a
 * line's square end reaches, never less, short of a polyline's corners,
 * which a canvas joins in points past its width, as `extentOf()` says.
 */
export function reachPastRoundRect(
  command: DrawCommand,
  area: Area,
  radius: number,
): number {
  const past = (point: Point): number => pastRoundRect(point, area, radius);
  const furthest = (points: readonly Point[]): number =>
    Math.max(...points.map(past));
  switch (command.kind) {
    case "rect":
    case "roundRect": {
      // Its corners' middles, a radius in from each side, and the radius
      // past them: a rectangle's are its corners.
      const corner = command.kind === "roundRect" ? command.radius : 0;
      const { x, y, width, height } = inset(command, corner);
      return (
        furthest([
          { x, y },
          { x: x + width, y },
          { x, y: y + height },
          { x: x + width, y: y + height },
        ]) + corner
      );
    }
    case "circle":
      return past(command) + command.radius;
    case "ring":
      return past(command) + command.radius + command.width / 2;
    case "line":
      return furthest([command.from, command.to]) + command.width / 2;
    case "polyline":
      return furthest(command.points) + command.width / 2;
    case "polygon":
      return furthest(command.points);
  }
}
