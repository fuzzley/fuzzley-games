import type { GameObjects } from "phaser";

/** A value for each corner of a gradient: top left, top right, bottom left and bottom right. */
type Corners = readonly [number, number, number, number];

/** A triangle's corners: x and y of the first, the second and the third. */
type Triangle = readonly [number, number, number, number, number, number];

/**
 * A command a `Graphics` was given, named after the method that writes it
 * into its command buffer, with that method's arguments by name.
 */
export type GraphicsCommand =
  | {
      readonly kind: "arc";
      readonly x: number;
      readonly y: number;
      readonly radius: number;
      readonly start: number;
      readonly end: number;
      readonly anticlockwise: boolean;
      readonly overshoot: number;
    }
  | { readonly kind: "beginPath" }
  | { readonly kind: "closePath" }
  | {
      readonly kind: "fillRect";
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
    }
  | { readonly kind: "lineTo"; readonly x: number; readonly y: number }
  | { readonly kind: "moveTo"; readonly x: number; readonly y: number }
  | {
      readonly kind: "lineStyle";
      readonly width: number;
      readonly color: number;
      readonly alpha: number;
    }
  | {
      readonly kind: "fillStyle";
      readonly color: number;
      readonly alpha: number;
    }
  | { readonly kind: "fillPath" }
  | { readonly kind: "strokePath" }
  | {
      readonly kind: "fillTriangle" | "strokeTriangle";
      readonly points: Triangle;
    }
  | { readonly kind: "save" }
  | { readonly kind: "restore" }
  | {
      readonly kind: "translateCanvas" | "scaleCanvas";
      readonly x: number;
      readonly y: number;
    }
  | { readonly kind: "rotateCanvas"; readonly radians: number }
  | {
      readonly kind: "fillGradientStyle";
      readonly colors: Corners;
      readonly alphas: Corners;
    }
  | {
      readonly kind: "lineGradientStyle";
      readonly width: number;
      readonly colors: Corners;
      readonly alpha: number;
    };

/**
 * The number Phaser writes into a `Graphics`'s command buffer for each
 * command, from its `Commands.js`, which it doesn't export. The spec beside
 * this file holds each to what Phaser writes, so a release that numbers them
 * anew fails there first.
 */
const OPCODES = {
  arc: 0,
  beginPath: 1,
  closePath: 2,
  fillRect: 3,
  lineTo: 4,
  moveTo: 5,
  lineStyle: 6,
  fillStyle: 7,
  fillPath: 8,
  strokePath: 9,
  fillTriangle: 10,
  strokeTriangle: 11,
  save: 14,
  restore: 15,
  translateCanvas: 16,
  scaleCanvas: 17,
  rotateCanvas: 18,
  fillGradientStyle: 21,
  lineGradientStyle: 22,
} as const;

/**
 * Returns each command a `Graphics` holds, in order, read from the command
 * buffer Phaser plays each frame it draws it.
 *
 * @throws {Error} For a number that names no command, as one a release of
 *   Phaser added would, whose arguments it can't step over.
 */
export function commandsOf(
  graphics: GameObjects.Graphics,
): readonly GraphicsCommand[] {
  const buffer: readonly unknown[] = graphics.commandBuffer;
  let at = 0;
  const next = (): number => Number(buffer[at++]);
  const commands: GraphicsCommand[] = [];
  while (at < buffer.length) commands.push(commandOf(buffer[at++], next));
  return commands;
}

/**
 * Returns the command a number names, its arguments read from `next` in the
 * order Phaser writes them.
 */
function commandOf(opcode: unknown, next: () => number): GraphicsCommand {
  switch (opcode) {
    case OPCODES.arc:
      return {
        kind: "arc",
        x: next(),
        y: next(),
        radius: next(),
        start: next(),
        end: next(),
        anticlockwise: Boolean(next()),
        overshoot: next(),
      };
    case OPCODES.beginPath:
      return { kind: "beginPath" };
    case OPCODES.closePath:
      return { kind: "closePath" };
    case OPCODES.fillRect:
      return {
        kind: "fillRect",
        x: next(),
        y: next(),
        width: next(),
        height: next(),
      };
    case OPCODES.lineTo:
      return { kind: "lineTo", x: next(), y: next() };
    case OPCODES.moveTo:
      return { kind: "moveTo", x: next(), y: next() };
    case OPCODES.lineStyle:
      return { kind: "lineStyle", width: next(), color: next(), alpha: next() };
    case OPCODES.fillStyle:
      return { kind: "fillStyle", color: next(), alpha: next() };
    case OPCODES.fillPath:
      return { kind: "fillPath" };
    case OPCODES.strokePath:
      return { kind: "strokePath" };
    case OPCODES.fillTriangle:
      return { kind: "fillTriangle", points: triangle(next) };
    case OPCODES.strokeTriangle:
      return { kind: "strokeTriangle", points: triangle(next) };
    case OPCODES.save:
      return { kind: "save" };
    case OPCODES.restore:
      return { kind: "restore" };
    case OPCODES.translateCanvas:
      return { kind: "translateCanvas", x: next(), y: next() };
    case OPCODES.scaleCanvas:
      return { kind: "scaleCanvas", x: next(), y: next() };
    case OPCODES.rotateCanvas:
      return { kind: "rotateCanvas", radians: next() };
    case OPCODES.fillGradientStyle:
      // Phaser writes the alphas before the colors.
      return {
        kind: "fillGradientStyle",
        alphas: corners(next),
        colors: corners(next),
      };
    case OPCODES.lineGradientStyle:
      return {
        kind: "lineGradientStyle",
        width: next(),
        alpha: next(),
        colors: corners(next),
      };
    default:
      throw new Error(
        `A Graphics holds ${String(opcode)}, which names no command of Phaser's.`,
      );
  }
}

/** Returns the next four numbers, a gradient's corners. */
function corners(next: () => number): Corners {
  return [next(), next(), next(), next()];
}

/** Returns the next six numbers, a triangle's corners. */
function triangle(next: () => number): Triangle {
  return [next(), next(), next(), next(), next(), next()];
}

/**
 * Describes an arc a `Graphics` strokes: where, how far out, between which
 * angles and which way round, and in what line.
 */
export interface Stroke {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly start: number;
  readonly end: number;
  readonly anticlockwise: boolean;
  readonly width: number;
  readonly color: number;
}

/**
 * Returns each arc a `Graphics` strokes, a circle among them, in the order it
 * strokes them, as WebGL draws it: each in the width set as the arc is added
 * to its path, and in the color set as its path is stroked.
 *
 * @throws {Error} For an arc stroked in a gradient's corners of more than one
 *   color, which no one color describes.
 */
export function strokesOf(graphics: GameObjects.Graphics): readonly Stroke[] {
  const strokes: Stroke[] = [];
  let path: Omit<Stroke, "color">[] = [];
  // WebGL's line before a style is set: a pixel wide, its tint 0.
  let width = 1;
  let color: number | null = 0;
  for (const command of commandsOf(graphics)) {
    switch (command.kind) {
      case "beginPath":
        path = [];
        break;
      case "arc": {
        const { x, y, radius, start, end, anticlockwise } = command;
        path.push({ x, y, radius, start, end, anticlockwise, width });
        break;
      }
      case "lineStyle":
        ({ width, color } = command);
        break;
      case "lineGradientStyle":
        width = command.width;
        color = oneColorOf(command.colors);
        break;
      case "strokePath":
        if (path.length === 0) break;
        if (color === null) {
          throw new Error(
            "A Graphics strokes an arc in a gradient of more than one color, which no one color describes.",
          );
        }
        for (const arc of path) strokes.push({ ...arc, color });
        break;
      default:
        break;
    }
  }
  return strokes;
}

/** Returns the one color a gradient's corners share, or null where they differ. */
function oneColorOf([first, ...rest]: Corners): number | null {
  return rest.every((color) => color === first) ? first : null;
}

/**
 * Returns each color a `Graphics` is told to fill or stroke in, in order: the
 * color of each fill style and line style, and each corner of a gradient's.
 */
export function colorsOf(graphics: GameObjects.Graphics): readonly number[] {
  return commandsOf(graphics).flatMap((command) => {
    switch (command.kind) {
      case "fillStyle":
      case "lineStyle":
        return [command.color];
      case "fillGradientStyle":
      case "lineGradientStyle":
        return command.colors;
      default:
        return [];
    }
  });
}
