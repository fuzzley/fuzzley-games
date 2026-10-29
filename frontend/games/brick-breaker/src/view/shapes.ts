import type { FieldMetrics } from "./field_metrics";

/** Says where a point of a drawing is, in device pixels from its frame's top left corner. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Says where an area of a drawing lies, in device pixels from its frame's top left corner. */
export interface Area {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Describes one shape of a frame's drawing, in device pixels from the frame's top left corner. */
export type DrawCommand =
  | {
      readonly kind: "rect";
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
      readonly color: number;
    }
  | {
      readonly kind: "roundRect";
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
      readonly radius: number;
      readonly color: number;
    }
  | {
      readonly kind: "circle";
      readonly x: number;
      readonly y: number;
      readonly radius: number;
      readonly color: number;
    }
  | {
      /** A circle's outline, its line's middle at the radius. */
      readonly kind: "ring";
      readonly x: number;
      readonly y: number;
      readonly radius: number;
      readonly width: number;
      readonly color: number;
    }
  | {
      /** A line through points in turn, drawn as one path so its corners join. */
      readonly kind: "polyline";
      readonly points: readonly Point[];
      readonly width: number;
      readonly color: number;
    }
  | {
      readonly kind: "polygon";
      readonly points: readonly Point[];
      readonly color: number;
    };

/** Describes a frame of the atlas: its name, its size in device pixels and its drawing. */
export interface ArtFrame {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  /** Its shapes, each drawn over those before it. */
  readonly commands: readonly DrawCommand[];
}

/** Says what the art is drawn at: a field unit's device pixels, and a CSS pixel's. */
export type ArtScale = Pick<FieldMetrics, "unit" | "pixelRatio">;

/** How wide a line is, in field units, where that is more than a CSS pixel. */
const LINE = 0.06;

/** Returns how wide a line is, in whole device pixels: a CSS pixel at least. */
export function lineWidth(scale: ArtScale): number {
  return Math.max(Math.ceil(scale.pixelRatio), Math.round(scale.unit * LINE));
}

/** Returns a rectangle filled in a color. */
export function rect(area: Area, color: number): DrawCommand {
  return { kind: "rect", ...sized(area), color };
}

/** Returns a rectangle with rounded corners filled in a color. */
export function roundRect(
  area: Area,
  radius: number,
  color: number,
): DrawCommand {
  const box = sized(area);
  const most = Math.min(box.width, box.height) / 2;
  return {
    kind: "roundRect",
    ...box,
    radius: Math.min(most, Math.max(0, radius)),
    color,
  };
}

/** Returns a circle filled in a color. */
export function circle(
  x: number,
  y: number,
  radius: number,
  color: number,
): DrawCommand {
  return { kind: "circle", x, y, radius: Math.max(0, radius), color };
}

/** Returns a circle's outline in a color. */
export function ring(
  x: number,
  y: number,
  radius: number,
  width: number,
  color: number,
): DrawCommand {
  return { kind: "ring", x, y, radius: Math.max(0, radius), width, color };
}

/**
 * Returns an area no narrower and no shorter than nothing.
 *
 * The shapes with a size take none below nothing, as they and their radii
 * clamp: a unit too small for their insets, as the canvas has before it is
 * laid out, would give them one, and a canvas throws at a negative radius.
 */
function sized(area: Area): Area {
  return {
    x: area.x,
    y: area.y,
    width: Math.max(0, area.width),
    height: Math.max(0, area.height),
  };
}

/** Returns a polygon filled in a color. */
export function polygon(points: readonly Point[], color: number): DrawCommand {
  return { kind: "polygon", points, color };
}

/** Returns a line through points in turn, in a color. */
export function polyline(
  points: readonly Point[],
  width: number,
  color: number,
): DrawCommand {
  return { kind: "polyline", points, width, color };
}

/** Returns the four bars of a frame around the inside of an area, a width thick. */
export function frameAround(
  area: Area,
  width: number,
  color: number,
): readonly DrawCommand[] {
  const { x, y } = area;
  const right = x + area.width - width;
  const bottom = y + area.height - width;
  return [
    rect({ x, y, width: area.width, height: width }, color),
    rect({ x, y: bottom, width: area.width, height: width }, color),
    rect({ x, y, width, height: area.height }, color),
    rect({ x: right, y, width, height: area.height }, color),
  ];
}

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

/** Returns an area shrunk by an inset on each side. */
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

/** Returns the points of a star around a middle, its first point straight up. */
export function star(
  x: number,
  y: number,
  outer: number,
  inner: number,
  points: number,
): readonly Point[] {
  return Array.from({ length: points * 2 }, (_, i) => {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const radius = i % 2 === 0 ? outer : inner;
    return { x: x + Math.cos(angle) * radius, y: y + Math.sin(angle) * radius };
  });
}
