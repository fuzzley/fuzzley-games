// The vocabulary a game's art is drawn in: each shape of a frame as plain
// data in device pixels, which the scene's `atlasFrameOf()` plays into a
// `Graphics`, so the art itself knows no Phaser and its specs run without it.

/** Says where a point of a drawing is, in device pixels. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Says where an area of a drawing lies, in device pixels. */
export interface Area {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Describes a rectangle filled in a color. */
export interface RectCommand {
  readonly kind: "rect";
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly color: number;
}

/** Describes a rectangle with rounded corners filled in a color. */
export interface RoundRectCommand {
  readonly kind: "roundRect";
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly radius: number;
  readonly color: number;
}

/** Describes a circle filled in a color. */
export interface CircleCommand {
  readonly kind: "circle";
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly color: number;
}

/** Describes a circle's outline in a color, its line's middle at the radius. */
export interface RingCommand {
  readonly kind: "ring";
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly width: number;
  readonly color: number;
}

/** Describes a straight line from a point to another in a color, its ends cut straight across. */
export interface LineCommand {
  readonly kind: "line";
  readonly from: Point;
  readonly to: Point;
  readonly width: number;
  readonly color: number;
}

/**
 * Describes a line through points in turn in a color, drawn as one path so
 * its corners join; a canvas joins them in points, which may reach past
 * half its width.
 */
export interface PolylineCommand {
  readonly kind: "polyline";
  readonly points: readonly Point[];
  readonly width: number;
  readonly color: number;
}

/** Describes a polygon filled in a color. */
export interface PolygonCommand {
  readonly kind: "polygon";
  readonly points: readonly Point[];
  readonly color: number;
}

/** Describes one shape of a frame's drawing, in device pixels from the frame's top left corner. */
export type DrawCommand =
  | RectCommand
  | RoundRectCommand
  | CircleCommand
  | RingCommand
  | LineCommand
  | PolylineCommand
  | PolygonCommand;

/** Describes a frame of an atlas drawn in shapes: its name, its size in device pixels and its drawing. */
export interface ArtFrame {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  /** Its shapes, each drawn over those before it. */
  readonly commands: readonly DrawCommand[];
}

/** Says what a game's art is drawn at: a field unit's device pixels, and a CSS pixel's. */
export interface ArtScale {
  readonly unit: number;
  readonly pixelRatio: number;
}

/** Returns a width given in field units in whole device pixels, a CSS pixel at least. */
export function widthOf(units: number, scale: ArtScale): number {
  return Math.max(Math.ceil(scale.pixelRatio), Math.round(scale.unit * units));
}

/** How wide the art's lines are, in field units, where that is more than a CSS pixel. */
const LINE = 0.06;

/** Returns how wide the art's lines are, in whole device pixels: a CSS pixel at least. */
export function lineWidth(scale: ArtScale): number {
  return widthOf(LINE, scale);
}

/** Says what a filled shape is filled in. */
export interface FillStyle {
  readonly color: number;
}

/** Says what a line is drawn in, and how wide it is. */
export interface LineStyle {
  readonly color: number;
  readonly width: number;
}

/** The point a drawing about its middle is drawn about. */
export const ORIGIN: Point = { x: 0, y: 0 };

// Every builder takes its place as a named shape, an area, a point and a
// radius or a list of points, then its style. The shapes with a size take
// none below nothing, and their radii clamp: a unit too small for an inset,
// as a canvas has before it is laid out, would give them one, and a canvas
// throws at a negative radius.

/** Returns a rectangle filled over an area, no smaller than nothing. */
export function rect(area: Area, style: FillStyle): RectCommand {
  return { kind: "rect", ...sized(area), color: style.color };
}

/** Returns a rectangle with rounded corners filled over an area, no smaller than nothing, its corners' radius at most half its shorter side. */
export function roundRect(
  area: Area,
  radius: number,
  style: FillStyle,
): RoundRectCommand {
  const box = sized(area);
  const most = Math.min(box.width, box.height) / 2;
  return {
    kind: "roundRect",
    ...box,
    radius: Math.min(Math.max(radius, 0), most),
    color: style.color,
  };
}

/** Returns a circle filled about a middle. */
export function circle(
  middle: Point,
  radius: number,
  style: FillStyle,
): CircleCommand {
  return {
    kind: "circle",
    x: middle.x,
    y: middle.y,
    radius: Math.max(0, radius),
    color: style.color,
  };
}

/** Returns a circle's outline about a middle. */
export function ring(
  middle: Point,
  radius: number,
  style: LineStyle,
): RingCommand {
  return {
    kind: "ring",
    x: middle.x,
    y: middle.y,
    radius: Math.max(0, radius),
    width: style.width,
    color: style.color,
  };
}

/** Returns a straight line from a point to another. */
export function line(from: Point, to: Point, style: LineStyle): LineCommand {
  return { kind: "line", from, to, width: style.width, color: style.color };
}

/** Returns a line through points in turn, drawn as one path. */
export function polyline(
  points: readonly Point[],
  style: LineStyle,
): PolylineCommand {
  return {
    kind: "polyline",
    points,
    width: style.width,
    color: style.color,
  };
}

/** Returns a polygon filled within points. */
export function polygon(
  points: readonly Point[],
  style: FillStyle,
): PolygonCommand {
  return { kind: "polygon", points, color: style.color };
}

/**
 * Returns a line through points in turn, round at its ends and its
 * corners: a straight line between each two, and a dot as wide at each.
 *
 * It is drawn so rather than as a {@link polyline}, as a canvas joins a
 * path's corners in points that reach past its width, so what it draws,
 * and so its frame's size, would hang on the renderer.
 */
export function stroke(
  points: readonly Point[],
  style: LineStyle,
): readonly DrawCommand[] {
  return [
    ...points.flatMap((from, i) =>
      points.slice(i + 1, i + 2).map((to) => line(from, to, style)),
    ),
    ...points.map((point) => circle(point, style.width / 2, style)),
  ];
}

/** Returns an area no narrower and no shorter than nothing. */
function sized(area: Area): Area {
  return {
    x: area.x,
    y: area.y,
    width: Math.max(0, area.width),
    height: Math.max(0, area.height),
  };
}

/**
 * Returns the area what a command draws covers.
 *
 * A polyline reaches half its width past its points, the points its
 * corners are joined in aside.
 */
export function extentOf(command: DrawCommand): Area {
  const { left, top, right, bottom } = edgesOf(command);
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/** Says how far a drawing reaches each way: its left, top, right and bottom. */
export interface Edges {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/**
 * Returns how far what a command draws reaches each way, as
 * {@link extentOf} does, its right and bottom as reached rather than worked
 * out from a width, so a frame sized by them takes no rounding.
 */
export function edgesOf(command: DrawCommand): Edges {
  switch (command.kind) {
    case "rect":
    case "roundRect":
      return {
        left: command.x,
        top: command.y,
        right: command.x + command.width,
        bottom: command.y + command.height,
      };
    case "circle":
    case "ring": {
      const reach =
        command.radius + (command.kind === "ring" ? command.width / 2 : 0);
      return {
        left: command.x - reach,
        top: command.y - reach,
        right: command.x + reach,
        bottom: command.y + reach,
      };
    }
    case "line": {
      // An end is cut straight across the line, half its width either side of its point.
      const { from, to } = command;
      const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
      const across = (Math.abs(to.y - from.y) / length) * (command.width / 2);
      const down = (Math.abs(to.x - from.x) / length) * (command.width / 2);
      return {
        left: Math.min(from.x, to.x) - across,
        top: Math.min(from.y, to.y) - down,
        right: Math.max(from.x, to.x) + across,
        bottom: Math.max(from.y, to.y) + down,
      };
    }
    case "polyline":
    case "polygon": {
      const half = command.kind === "polyline" ? command.width / 2 : 0;
      const xs = command.points.map((point) => point.x);
      const ys = command.points.map((point) => point.y);
      return {
        left: Math.min(...xs) - half,
        top: Math.min(...ys) - half,
        right: Math.max(...xs) + half,
        bottom: Math.max(...ys) + half,
      };
    }
  }
}
