// What moves, scales and frames a drawing. `shifted()` and `scaledBy()` are
// each a `switch` over every kind of `DrawCommand`, and `centered()` and
// `bounded()` lean on the one in `edgesOf()`, in `shapes.ts`, so a new kind
// fails in the library's build rather than in a game's.

import {
  type ArtFrame,
  type DrawCommand,
  ORIGIN,
  type Point,
  edgesOf,
} from "./shapes";

/** Returns points scaled about the origin by a factor, then moved to a place. */
export function placed(
  points: readonly Point[],
  by: number,
  at: Point = ORIGIN,
): readonly Point[] {
  return points.map((point) => ({
    x: at.x + point.x * by,
    y: at.y + point.y * by,
  }));
}

/** Returns a command moved across and down by an offset. */
export function shifted(command: DrawCommand, offset: Point): DrawCommand {
  switch (command.kind) {
    case "rect":
    case "roundRect":
    case "circle":
    case "ring":
      return { ...command, x: command.x + offset.x, y: command.y + offset.y };
    case "line":
      return {
        ...command,
        from: { x: command.from.x + offset.x, y: command.from.y + offset.y },
        to: { x: command.to.x + offset.x, y: command.to.y + offset.y },
      };
    case "polyline":
    case "polygon":
      return { ...command, points: placed(command.points, 1, offset) };
  }
}

/**
 * Returns a command scaled about the origin by a factor, its lines' widths
 * with it.
 *
 * The factor is nothing or more: a negative one gives a negative size or
 * radius, which no builder makes.
 */
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

/**
 * Returns a frame of a drawing about the origin, its middle the frame's: as
 * wide and as tall as the drawing reaches out from it either way, in whole
 * pixels, two at least.
 */
export function centered(
  name: string,
  commands: readonly DrawCommand[],
): ArtFrame {
  let across = 1;
  let down = 1;
  for (const command of commands) {
    const { left, top, right, bottom } = edgesOf(command);
    across = Math.max(across, -left, right);
    down = Math.max(down, -top, bottom);
  }
  const x = Math.ceil(across);
  const y = Math.ceil(down);
  return {
    name,
    width: 2 * x,
    height: 2 * y,
    commands: commands.map((command) => shifted(command, { x, y })),
  };
}

/**
 * Returns a frame of a drawing about the middle of its own bounds, as a
 * picture is, which nothing places by a point of its own.
 */
export function bounded(
  name: string,
  commands: readonly DrawCommand[],
): ArtFrame {
  const edges = commands.map(edgesOf);
  const x =
    (Math.min(...edges.map(({ left }) => left)) +
      Math.max(...edges.map(({ right }) => right))) /
    2;
  const y =
    (Math.min(...edges.map(({ top }) => top)) +
      Math.max(...edges.map(({ bottom }) => bottom))) /
    2;
  return centered(
    name,
    commands.map((command) => shifted(command, { x: -x, y: -y })),
  );
}
