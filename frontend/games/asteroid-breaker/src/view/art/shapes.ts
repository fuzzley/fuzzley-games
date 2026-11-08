// Asteroid Breaker's own helpers for its art, over `@fz/phaser/shapes`: the
// widths it draws in, the curves and outlines its frames are built from,
// each flattened into points, since a frame is baked once and the scene's
// drawing knows only straight lines and circles, and the frames that hold
// a drawing about its middle.

import { clamp } from "@fz/core/math";
import {
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  type Point,
  circle,
  extentOf,
  line,
  widthOf,
} from "@fz/phaser/shapes";
import { wholePixels } from "../field/field_metrics";

/**
 * The most device pixels a field unit is baked at; the scene scales the
 * art up past it, so the largest window's atlas still fits a texture every
 * device takes.
 */
export const MOST_BAKED_UNIT = 32;

/** How wide a line is, in field units, where that is more than a CSS pixel. */
const LINE = 0.06;

/**
 * How wide the outline around a rock, the ship, a pickup or the comet is, in
 * field units, where that is more than a CSS pixel.
 */
const OUTLINE = 0.12;

/** How many straight pieces a curve is drawn in. */
const CURVE_PIECES = 8;

/**
 * How many straight pieces a whole turn of an arc is drawn in, and a share of
 * them for a part of one.
 */
const TURN_PIECES = 40;

/** How far an outline's corner may reach out, against its width, so a sharp corner can't spike. */
const MOST_MITER = 2;

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

/** Returns how wide a line is, in whole device pixels: a CSS pixel at least. */
export function lineWidth(scale: ArtScale): number {
  return widthOf(LINE, scale);
}

/** Returns how wide an outline is, in whole device pixels: a CSS pixel at least. */
export function outlineWidth(scale: ArtScale): number {
  return widthOf(OUTLINE, scale);
}

/**
 * Returns a line through points in turn, round at its ends and its
 * corners: a straight line between each two, and a dot as wide at each.
 *
 * It is drawn so rather than as one path, as a canvas joins a path's
 * corners in points that reach past its width, so what it draws, and so
 * its frame's size, would hang on the renderer.
 */
export function stroke(
  points: readonly Point[],
  width: number,
  color: number,
): readonly DrawCommand[] {
  return [
    ...points.slice(1).map((to, i) => line(points[i] ?? to, to, width, color)),
    ...points.map((point) => circle(point.x, point.y, width / 2, color)),
  ];
}

/**
 * Returns a ring about the origin drawn as dashes, each an arc, as many as fit
 * a dash and a gap apart.
 */
export function dashedRing(
  radius: number,
  width: number,
  dash: { readonly dash: number; readonly gap: number },
  color: number,
): readonly DrawCommand[] {
  const count = Math.max(
    1,
    Math.round((2 * Math.PI * radius) / (dash.dash + dash.gap)),
  );
  return Array.from({ length: count }, (_, i) => {
    const from = (i / count) * 2 * Math.PI;
    return stroke(
      arcPoints(0, 0, radius, from, from + dash.dash / radius),
      width,
      color,
    );
  }).flat();
}

/**
 * Returns the points along an arc, from an angle to another, in radians
 * clockwise from the right, both ends among them.
 */
export function arcPoints(
  x: number,
  y: number,
  radius: number,
  from: number,
  to: number,
): readonly Point[] {
  const pieces = Math.max(
    1,
    Math.ceil((Math.abs(to - from) / (2 * Math.PI)) * TURN_PIECES),
  );
  return Array.from({ length: pieces + 1 }, (_, i) => {
    const angle = from + ((to - from) * i) / pieces;
    return { x: x + Math.cos(angle) * radius, y: y + Math.sin(angle) * radius };
  });
}

/** Returns the points around an ellipse, a whole turn of them, the first not repeated. */
export function ellipsePoints(
  x: number,
  y: number,
  across: number,
  down: number,
): readonly Point[] {
  return Array.from({ length: TURN_PIECES }, (_, i) => {
    const angle = (i / TURN_PIECES) * 2 * Math.PI;
    return { x: x + Math.cos(angle) * across, y: y + Math.sin(angle) * down };
  });
}

/**
 * Returns the points along a quadratic curve, past its start to its end, so
 * curves in turn join without a point twice.
 */
export function quadraticPoints(
  from: Point,
  control: Point,
  to: Point,
): readonly Point[] {
  return Array.from({ length: CURVE_PIECES }, (_, i) => {
    const t = (i + 1) / CURVE_PIECES;
    const u = 1 - t;
    return {
      x: u * u * from.x + 2 * u * t * control.x + t * t * to.x,
      y: u * u * from.y + 2 * u * t * control.y + t * t * to.y,
    };
  });
}

/**
 * Returns the points along a cubic curve, past its start to its end, as
 * {@link quadraticPoints} does.
 */
export function cubicPoints(
  from: Point,
  first: Point,
  second: Point,
  to: Point,
): readonly Point[] {
  return Array.from({ length: CURVE_PIECES }, (_, i) => {
    const t = (i + 1) / CURVE_PIECES;
    const u = 1 - t;
    const a = u * u * u;
    const b = 3 * u * u * t;
    const c = 3 * u * t * t;
    const d = t * t * t;
    return {
      x: a * from.x + b * first.x + c * second.x + d * to.x,
      y: a * from.y + b * first.y + c * second.y + d * to.y,
    };
  });
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

/** Returns points scaled about the origin by a factor, then moved to a place. */
export function placed(
  points: readonly Point[],
  by: number,
  x = 0,
  y = 0,
): readonly Point[] {
  return points.map((point) => ({ x: x + point.x * by, y: y + point.y * by }));
}

/**
 * Returns a frame of a drawing about its middle: as wide and as tall as the
 * drawing reaches out from it either way, in whole pixels.
 */
export function centered(
  name: string,
  commands: readonly DrawCommand[],
): ArtFrame {
  let across = 1;
  let down = 1;
  for (const command of commands) {
    const [left, top, right, bottom] = extentOf(command);
    across = Math.max(across, -left, right);
    down = Math.max(down, -top, bottom);
  }
  const x = Math.ceil(across);
  const y = Math.ceil(down);
  return {
    name,
    width: 2 * x,
    height: 2 * y,
    commands: commands.map((command) => shifted(command, x, y)),
  };
}

/**
 * Returns a frame of a drawing about the middle of its own bounds, as a picture
 * is, which nothing places by a point of its own.
 */
export function bounded(
  name: string,
  commands: readonly DrawCommand[],
): ArtFrame {
  const extents = commands.map(extentOf);
  const x =
    (Math.min(...extents.map(([left]) => left)) +
      Math.max(...extents.map(([, , right]) => right))) /
    2;
  const y =
    (Math.min(...extents.map(([, top]) => top)) +
      Math.max(...extents.map(([, , , bottom]) => bottom))) /
    2;
  return centered(
    name,
    commands.map((command) => shifted(command, -x, -y)),
  );
}

/** Returns a command scaled about the origin by a factor, its lines' widths with it. */
export function scaledBy(command: DrawCommand, by: number): DrawCommand {
  switch (command.kind) {
    case "rect":
      return {
        ...command,
        x: command.x * by,
        y: command.y * by,
        width: command.width * by,
        height: command.height * by,
      };
    case "roundRect":
      return {
        ...command,
        x: command.x * by,
        y: command.y * by,
        width: command.width * by,
        height: command.height * by,
        radius: command.radius * by,
      };
    case "circle":
      return {
        ...command,
        x: command.x * by,
        y: command.y * by,
        radius: command.radius * by,
      };
    case "ring":
      return {
        ...command,
        x: command.x * by,
        y: command.y * by,
        radius: command.radius * by,
        width: command.width * by,
      };
    case "line":
      return {
        ...command,
        from: { x: command.from.x * by, y: command.from.y * by },
        to: { x: command.to.x * by, y: command.to.y * by },
        width: command.width * by,
      };
    case "polyline":
      return {
        ...command,
        points: placed(command.points, by),
        width: command.width * by,
      };
    case "polygon":
      return { ...command, points: placed(command.points, by) };
  }
}

/** Returns a command moved across and down. */
export function shifted(
  command: DrawCommand,
  x: number,
  y: number,
): DrawCommand {
  switch (command.kind) {
    case "rect":
    case "roundRect":
    case "circle":
    case "ring":
      return { ...command, x: command.x + x, y: command.y + y };
    case "line":
      return {
        ...command,
        from: { x: command.from.x + x, y: command.from.y + y },
        to: { x: command.to.x + x, y: command.to.y + y },
      };
    case "polyline":
    case "polygon":
      return { ...command, points: placed(command.points, 1, x, y) };
  }
}
