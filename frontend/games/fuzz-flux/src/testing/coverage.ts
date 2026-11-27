// Which points of a grid laid over a drawing its shapes cover, whatever
// their colors, so a spec weighs a drawing's outline alone, as a mask: an
// even grid of points stands for the area under it, each point's share of
// it the same.

import { type DrawCommand, type Point, extentOf } from "@fz/phaser/shapes";

/** Describes a grid of points, in rows from its top left one: where that one lies, how far apart two neighbors lie, and how many there are across and down. */
export interface Grid {
  readonly from: Point;
  readonly step: number;
  readonly across: number;
  readonly down: number;
}

/**
 * Returns which points of a grid a drawing covers, row by row from its
 * top left, 1 for a point a shape covers and 0 for one none does, each
 * shape at any alpha and in any color.
 *
 * A line's ends are cut straight across, as a canvas cuts them, and a
 * polyline's corners are left out, as a stroke's dots fill them.
 */
export function coverageOf(
  commands: readonly DrawCommand[],
  grid: Grid,
): Uint8Array {
  const covered = new Uint8Array(grid.across * grid.down);
  for (const command of commands) {
    const { x, y, width, height } = extentOf(command);
    const left = Math.max(0, Math.ceil((x - grid.from.x) / grid.step));
    const top = Math.max(0, Math.ceil((y - grid.from.y) / grid.step));
    const right = Math.min(
      grid.across - 1,
      Math.floor((x + width - grid.from.x) / grid.step),
    );
    const bottom = Math.min(
      grid.down - 1,
      Math.floor((y + height - grid.from.y) / grid.step),
    );
    for (let row = top; row <= bottom; row++) {
      for (let column = left; column <= right; column++) {
        const point = {
          x: grid.from.x + column * grid.step,
          y: grid.from.y + row * grid.step,
        };
        if (covers(command, point)) covered[row * grid.across + column] = 1;
      }
    }
  }
  return covered;
}

/**
 * Returns the share of the points either of two coverages of one grid
 * covers that only one of them does: 0 for two alike, 1 for two that
 * share no point.
 */
export function shareApart(one: Uint8Array, other: Uint8Array): number {
  let either = 0;
  let onlyOne = 0;
  one.forEach((point, i) => {
    const otherPoint = other[i] ?? 0;
    either += point | otherPoint;
    onlyOne += point ^ otherPoint;
  });
  return either === 0 ? 0 : onlyOne / either;
}

/** Returns whether a shape covers a point. */
function covers(command: DrawCommand, point: Point): boolean {
  switch (command.kind) {
    case "rect":
      return true;
    case "roundRect": {
      const { x, y, width, height, radius } = command;
      const aside = Math.max(
        x + radius - point.x,
        point.x - (x + width - radius),
        0,
      );
      const below = Math.max(
        y + radius - point.y,
        point.y - (y + height - radius),
        0,
      );
      return Math.hypot(aside, below) <= radius;
    }
    case "circle":
      return (
        Math.hypot(point.x - command.x, point.y - command.y) <= command.radius
      );
    case "ring":
      return (
        Math.abs(
          Math.hypot(point.x - command.x, point.y - command.y) - command.radius,
        ) <=
        command.width / 2
      );
    case "line":
      return onBand(point, command.from, command.to, command.width);
    case "polyline":
      return command.points.some((from, i) => {
        const to = command.points[i + 1];
        return to !== undefined && onBand(point, from, to, command.width);
      });
    case "polygon":
      return inside(point, command.points);
  }
}

/** Returns whether a point lies on a line between two others drawn a width wide, its ends cut straight across. */
function onBand(point: Point, from: Point, to: Point, width: number): boolean {
  const across = to.x - from.x;
  const down = to.y - from.y;
  const squared = across * across + down * down;
  if (squared === 0) return false;
  const along =
    ((point.x - from.x) * across + (point.y - from.y) * down) / squared;
  const aside =
    Math.abs((point.x - from.x) * down - (point.y - from.y) * across) /
    Math.sqrt(squared);
  return along >= 0 && along <= 1 && aside <= width / 2;
}

/** Returns whether a point lies inside a polygon, by how many of its edges a line from it to the right crosses. */
function inside(point: Point, corners: readonly Point[]): boolean {
  let crossings = 0;
  corners.forEach((from, i) => {
    const to = corners[(i + 1) % corners.length] ?? from;
    if (from.y > point.y !== to.y > point.y) {
      const at =
        from.x + ((point.y - from.y) / (to.y - from.y)) * (to.x - from.x);
      if (at > point.x) crossings++;
    }
  });
  return crossings % 2 === 1;
}
