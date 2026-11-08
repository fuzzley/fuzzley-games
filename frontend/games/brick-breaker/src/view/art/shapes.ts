// Brick Breaker's own helpers for its art, over `@fz/phaser/shapes`: the
// areas, points and stars its frames are laid out by.

import {
  type Area,
  type DrawCommand,
  type LineStyle,
  type Point,
  rect,
} from "@fz/phaser/shapes";

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
