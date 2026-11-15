// A drawing's commands written as SVG, so a page shows the drawing a scene
// bakes, as an image or a mask, from the one list of commands.

import { cssHex } from "../color";
import type {
  ArtFrame,
  DrawCommand,
  FillStyle,
  LineStyle,
  PaintCommand,
  Point,
  WashCommand,
  WashStop,
} from "./shapes";

/** Describes a drawing as `svgOf()` writes it: its size in the commands' own pixels, and its shapes. */
export type Drawing = Pick<ArtFrame, "width" | "height" | "commands">;

/**
 * Describes a picture as `svgOf()` writes it, a drawing's or a painting's: its
 * size in the commands' own pixels, and its paint commands, washes among
 * them, each over those before it.
 */
export interface Painting {
  readonly width: number;
  readonly height: number;
  readonly commands: readonly PaintCommand[];
}

/**
 * Returns a drawing, or any picture of paint commands, written as an SVG
 * document, its size its own and each shape over those before it, as
 * `atlasFrameOf()` plays the commands into a canvas: a line's ends cut
 * straight across and a polyline's corners mitred, as far as a canvas
 * mitres them, a shape at part alpha at its fill's or its stroke's opacity,
 * and a wash as an ellipse filled with a radial gradient of its stops, which
 * the document's `<defs>` hold.
 *
 * Its size is in the commands' own pixels, which a page reads as CSS
 * pixels, so a drawing in device pixels is shown at its size over the pixel
 * ratio; and its colors are written `#rrggbb`, so it goes into a `data:` URL
 * through `encodeURIComponent()`. Its numbers are written to a thousandth
 * of a pixel.
 */
export function svgOf({ width, height, commands }: Painting): string {
  const size = `width="${num(width)}" height="${num(height)}"`;
  const box = `viewBox="0 0 ${num(width)} ${num(height)}"`;
  const gradients: string[] = [];
  const shapes = commands.map((command) => {
    if (command.kind !== "wash") return elementOf(command);
    const id = `wash-${String(gradients.length)}`;
    gradients.push(gradientOf(id, command.stops));
    return washOf(command, id);
  });
  const defs = gradients.length > 0 ? `<defs>${gradients.join("")}</defs>` : "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" ${size} ${box}>` +
    defs +
    shapes.join("") +
    "</svg>"
  );
}

/** How far a canvas lets a mitred corner reach, in the line's widths, which SVG's own default (4) would cut shorter. */
const CANVAS_MITER_LIMIT = 10;

/** Returns the SVG element that draws a command. */
function elementOf(command: DrawCommand): string {
  switch (command.kind) {
    case "rect":
      return element("rect", {
        x: command.x,
        y: command.y,
        width: command.width,
        height: command.height,
        ...fillOf(command),
      });
    case "roundRect":
      return element("rect", {
        x: command.x,
        y: command.y,
        width: command.width,
        height: command.height,
        rx: command.radius,
        ...fillOf(command),
      });
    case "circle":
      return element("circle", {
        cx: command.x,
        cy: command.y,
        r: command.radius,
        ...fillOf(command),
      });
    case "ring":
      return element("circle", {
        cx: command.x,
        cy: command.y,
        r: command.radius,
        fill: "none",
        ...strokeOf(command),
      });
    case "line":
      return element("line", {
        x1: command.from.x,
        y1: command.from.y,
        x2: command.to.x,
        y2: command.to.y,
        ...strokeOf(command),
      });
    case "polyline":
      return element("polyline", {
        points: pointsOf(command.points),
        fill: "none",
        ...strokeOf(command),
        "stroke-miterlimit": CANVAS_MITER_LIMIT,
      });
    case "polygon":
      return element("polygon", {
        points: pointsOf(command.points),
        ...fillOf(command),
      });
  }
}

/**
 * Returns the ellipse a wash fills, in the gradient of an id, which its
 * bounds lay out, so the gradient's edge is the ellipse's, before it is
 * turned.
 */
function washOf(command: WashCommand, id: string): string {
  const { x, y, radiusX, radiusY, turn, alpha } = command;
  const degrees = (turn * 180) / Math.PI;
  return element("ellipse", {
    cx: x,
    cy: y,
    rx: radiusX,
    ry: radiusY,
    fill: `url(#${id})`,
    ...(alpha === undefined ? {} : { "fill-opacity": alpha }),
    ...(turn === 0
      ? {}
      : { transform: `rotate(${num(degrees)} ${num(x)} ${num(y)})` }),
  });
}

/** Returns a radial gradient of an id through a wash's stops. */
function gradientOf(id: string, stops: readonly WashStop[]): string {
  const written = stops.map(({ at, color, alpha }) =>
    element("stop", {
      offset: at,
      "stop-color": cssHex(color),
      "stop-opacity": alpha,
    }),
  );
  return `<radialGradient id="${id}">${written.join("")}</radialGradient>`;
}

/** Describes an element's attributes, by name. */
type Attributes = Readonly<Record<string, string | number>>;

/** Returns the attributes that fill a shape in a style. */
function fillOf({ color, alpha }: FillStyle): Attributes {
  return {
    fill: cssHex(color),
    ...(alpha === undefined ? {} : { "fill-opacity": alpha }),
  };
}

/** Returns the attributes that stroke a line in a style. */
function strokeOf({ color, width, alpha }: LineStyle): Attributes {
  return {
    stroke: cssHex(color),
    "stroke-width": width,
    ...(alpha === undefined ? {} : { "stroke-opacity": alpha }),
  };
}

/** Returns an empty element of a name with its attributes, each number written as {@link num} writes it. */
function element(name: string, attributes: Attributes): string {
  const written = Object.entries(attributes).map(
    ([key, value]) =>
      `${key}="${typeof value === "number" ? num(value) : value}"`,
  );
  return `<${name} ${written.join(" ")}/>`;
}

/** Returns points as a `points` attribute lists them. */
function pointsOf(points: readonly Point[]): string {
  return points.map(({ x, y }) => `${num(x)},${num(y)}`).join(" ");
}

/** Returns a number written to a thousandth, with no trailing zeros; `String()` writes -0 as 0. */
function num(value: number): string {
  return String(Math.round(value * 1000) / 1000);
}
