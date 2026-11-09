import type { ArtFrame, ArtScale, DrawCommand, Point } from "@fz/phaser/shapes";
import { atlasFrames } from "../view/art/art";
import { bakedScale } from "../view/art/shapes";
import { type PaletteRoles, beltPalette } from "../view/colors/palette";

/** The roles the art's specs draw in, each a color no other role takes, and none white. */
const ROLES: PaletteRoles = {
  field: "#fafafa",
  fieldLine: "#c9ced4",
  fieldText: "#1b1f24",
  fieldMuted: "#5c6670",
  accent: "#2f7d4f",
  onAccent: "#f4fff8",
  danger: "#c62828",
  warning: "#a84b06",
};

/** The palette the art's specs draw in, a light one. */
export const ART_PALETTE = beltPalette(ROLES, "light");

/** The scale the art's specs draw at, a field unit of 24 device pixels at 2 to a CSS pixel. */
export const ART_SCALE: ArtScale = { unit: 24, pixelRatio: 2 };

/**
 * The pixel ratios the specs check the art at, from the least a canvas
 * renders at to the most, a browser zoomed to 110% on a screen of 1 among
 * them.
 */
export const PIXEL_RATIOS: readonly number[] = [1, 1.1, 1.25, 1.5, 2, 3];

/**
 * The scales a field is drawn at, each as it is baked: the smallest unit the
 * layout check holds a field to, 6 CSS px, at each pixel ratio, the specs'
 * own, and the largest at the least pixel ratio and the most.
 */
export const ART_SCALES: readonly ArtScale[] = [
  ...PIXEL_RATIOS.map((pixelRatio) =>
    bakedScale({ unit: 6 * pixelRatio, pixelRatio }),
  ),
  ART_SCALE,
  bakedScale({ unit: 120, pixelRatio: 1 }),
  bakedScale({ unit: 120, pixelRatio: 3 }),
];

/**
 * The atlas's frames in the specs' palette, at their scale, among which a
 * spec finds one by its name with `@fz/phaser/testing/pure`'s `frameNamed()`.
 */
export const ART_FRAMES: readonly ArtFrame[] = atlasFrames(
  ART_PALETTE,
  ART_SCALE,
);

/**
 * Returns whether a point lies inside a polygon or on its edge, by how many of
 * its sides a ray from it crosses.
 */
export function within(point: Point, polygon: readonly Point[]): boolean {
  const sides = polygon.map(
    (a, i) => [a, polygon[(i + 1) % polygon.length] ?? a] as const,
  );
  if (sides.some(([a, b]) => distanceToSide(point, a, b) < 1e-6)) return true;
  const crossings = sides.filter(
    ([a, b]) =>
      a.y > point.y !== b.y > point.y &&
      a.x + ((point.y - a.y) * (b.x - a.x)) / (b.y - a.y) > point.x,
  );
  return crossings.length % 2 === 1;
}

/** Returns how far a point is from a polygon's nearest side. */
export function distanceToEdge(
  point: Point,
  polygon: readonly Point[],
): number {
  return Math.min(
    ...polygon.map((a, i) =>
      distanceToSide(point, a, polygon[(i + 1) % polygon.length] ?? a),
    ),
  );
}

/** Returns how far a point is from a side of a polygon, from one corner to the next. */
function distanceToSide(point: Point, a: Point, b: Point): number {
  const length = (b.x - a.x) ** 2 + (b.y - a.y) ** 2 || 1;
  const along = Math.max(
    0,
    Math.min(
      1,
      ((point.x - a.x) * (b.x - a.x) + (point.y - a.y) * (b.y - a.y)) / length,
    ),
  );
  return Math.hypot(
    point.x - (a.x + along * (b.x - a.x)),
    point.y - (a.y + along * (b.y - a.y)),
  );
}

/**
 * Returns points around the edge of what a command draws: a circle's or a
 * ring's round it, a line's along both its sides, a rectangle's or a
 * polygon's corners.
 *
 * @throws {Error} For a polyline, which the game's art never draws, as a
 *   canvas joins its corners past its width.
 */
export function edgeOf(command: DrawCommand): readonly Point[] {
  switch (command.kind) {
    case "rect":
    case "roundRect":
      return [
        { x: command.x, y: command.y },
        { x: command.x + command.width, y: command.y },
        { x: command.x + command.width, y: command.y + command.height },
        { x: command.x, y: command.y + command.height },
      ];
    case "circle":
    case "ring": {
      const reach =
        command.radius + (command.kind === "ring" ? command.width / 2 : 0);
      return Array.from({ length: 16 }, (_, i) => ({
        x: command.x + Math.cos((i / 16) * 2 * Math.PI) * reach,
        y: command.y + Math.sin((i / 16) * 2 * Math.PI) * reach,
      }));
    }
    case "line": {
      const { from, to } = command;
      const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
      const across = ((to.y - from.y) / length) * (command.width / 2);
      const down = ((from.x - to.x) / length) * (command.width / 2);
      return [from, to].flatMap((end) => [
        { x: end.x + across, y: end.y + down },
        { x: end.x - across, y: end.y - down },
      ]);
    }
    case "polyline":
      throw new Error("The game's art draws no polyline.");
    case "polygon":
      return command.points;
  }
}

/**
 * Returns how far from a frame's middle what it draws reaches, in device
 * pixels, however it is turned.
 */
export function reachOf(frame: ArtFrame): number {
  const middle = { x: frame.width / 2, y: frame.height / 2 };
  const from = (x: number, y: number): number =>
    Math.hypot(x - middle.x, y - middle.y);
  return Math.max(
    ...frame.commands.map((command) => {
      switch (command.kind) {
        case "circle":
          return from(command.x, command.y) + command.radius;
        case "ring":
          return (
            from(command.x, command.y) + command.radius + command.width / 2
          );
        case "roundRect": {
          const { x, y, width, height, radius } = command;
          const corners = [
            from(x + radius, y + radius),
            from(x + width - radius, y + radius),
            from(x + width - radius, y + height - radius),
            from(x + radius, y + height - radius),
          ];
          return Math.max(...corners) + radius;
        }
        default:
          return Math.max(...edgeOf(command).map(({ x, y }) => from(x, y)));
      }
    }),
  );
}
