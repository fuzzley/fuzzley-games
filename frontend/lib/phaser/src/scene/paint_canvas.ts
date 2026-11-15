import type { Scene } from "phaser";
import type { DrawCommand, PaintCommand, Point, WashCommand } from "../shapes";
import { keepDrawn } from "./bake_texture";
import { drawCanvasTexture } from "./canvas_texture";

/** A turn, in radians. */
const TURN = 2 * Math.PI;

/** A quarter of a turn, in radians. */
const QUARTER = Math.PI / 2;

/**
 * Paints commands on a canvas's 2D context, each over those before it: a
 * shape as `atlasFrameOf()` has a `Graphics` draw it on a canvas, call for
 * call, and a wash with the context's own radial gradient, each at its alpha
 * under the context's own.
 */
export function paintCommands(
  context: CanvasRenderingContext2D,
  commands: readonly PaintCommand[],
): void {
  for (const command of commands) {
    if (command.kind === "wash") paintWash(context, command);
    else paintShape(context, command);
  }
}

/**
 * Paints commands into the canvas texture of a key at a size, through
 * `drawCanvasTexture()`, so it uploads once, painted, and paints it again
 * whenever a lost WebGL context is restored, as `bakeTexture()` bakes one.
 */
export function paintTexture(
  scene: Scene,
  key: string,
  width: number,
  height: number,
  commands: readonly PaintCommand[],
): void {
  keepDrawn(scene, key, () => {
    drawCanvasTexture(scene, key, width, height, (context) => {
      paintCommands(context, commands);
    });
  });
}

/**
 * Paints a shape as Phaser's canvas renderer plays the `Graphics` commands
 * `atlasFrameOf()` gives it: in a fill or a stroke style of its color at its
 * alpha, 1 where it has none, and through the same path.
 */
function paintShape(
  context: CanvasRenderingContext2D,
  command: DrawCommand,
): void {
  switch (command.kind) {
    case "rect":
      context.fillStyle = rgbaOf(command.color, command.alpha);
      context.fillRect(command.x, command.y, command.width, command.height);
      return;
    case "roundRect": {
      const { x, y, width, height, radius } = command;
      context.fillStyle = rgbaOf(command.color, command.alpha);
      context.beginPath();
      context.moveTo(x + radius, y);
      context.lineTo(x + width - radius, y);
      context.arc(x + width - radius, y + radius, radius, -QUARTER, 0, false);
      context.lineTo(x + width, y + height - radius);
      context.arc(
        x + width - radius,
        y + height - radius,
        radius,
        0,
        QUARTER,
        false,
      );
      context.lineTo(x + radius, y + height);
      context.arc(
        x + radius,
        y + height - radius,
        radius,
        QUARTER,
        Math.PI,
        false,
      );
      context.lineTo(x, y + radius);
      context.arc(x + radius, y + radius, radius, -Math.PI, -QUARTER, false);
      context.fill();
      return;
    }
    case "circle":
      context.fillStyle = rgbaOf(command.color, command.alpha);
      context.beginPath();
      context.arc(command.x, command.y, command.radius, 0, TURN, false);
      context.fill();
      return;
    case "ring":
      strokeIn(context, command.width, command.color, command.alpha);
      context.beginPath();
      context.arc(command.x, command.y, command.radius, 0, TURN, false);
      context.stroke();
      return;
    case "line":
      strokeIn(context, command.width, command.color, command.alpha);
      tracePath(context, [command.from, command.to]);
      context.stroke();
      return;
    case "polyline":
      strokeIn(context, command.width, command.color, command.alpha);
      tracePath(context, command.points);
      context.stroke();
      return;
    case "polygon":
      context.fillStyle = rgbaOf(command.color, command.alpha);
      // A Graphics closes a polygon's shape back to its first point.
      tracePath(context, [...command.points, ...command.points.slice(0, 1)]);
      context.fill();
      return;
  }
}

/**
 * Paints a wash: a circle of radius 1 about the origin, filled with a radial
 * gradient of its stops out to that radius, stretched to its radii and
 * turned about its middle, at its alpha under the context's. A wash with no
 * width or no height paints nothing, as SVG draws none.
 */
function paintWash(context: CanvasRenderingContext2D, wash: WashCommand): void {
  if (wash.radiusX === 0 || wash.radiusY === 0) return;
  context.save();
  context.translate(wash.x, wash.y);
  context.rotate(wash.turn);
  context.scale(wash.radiusX, wash.radiusY);
  const gradient = context.createRadialGradient(0, 0, 0, 0, 0, 1);
  for (const stop of wash.stops) {
    gradient.addColorStop(stop.at, rgbaOf(stop.color, stop.alpha));
  }
  context.fillStyle = gradient;
  context.globalAlpha *= wash.alpha ?? 1;
  context.beginPath();
  context.arc(0, 0, 1, 0, TURN, false);
  context.fill();
  context.restore();
}

/** Sets the context's line to a width and a color at an alpha, as a `Graphics` line style does. */
function strokeIn(
  context: CanvasRenderingContext2D,
  width: number,
  color: number,
  alpha: number | undefined,
): void {
  context.strokeStyle = rgbaOf(color, alpha);
  context.lineWidth = width;
}

/** Starts a path through points in turn, as a `Graphics` traces one. */
function tracePath(
  context: CanvasRenderingContext2D,
  points: readonly Point[],
): void {
  context.beginPath();
  points.forEach((point, i) => {
    if (i === 0) context.moveTo(point.x, point.y);
    else context.lineTo(point.x, point.y);
  });
}

/** Returns a color at an alpha, 1 where it has none, as Phaser's canvas renderer writes a style. */
function rgbaOf(color: number, alpha: number | undefined): string {
  const red = (color >> 16) & 0xff;
  const green = (color >> 8) & 0xff;
  const blue = color & 0xff;
  return `rgba(${String(red)},${String(green)},${String(blue)},${String(alpha ?? 1)})`;
}
