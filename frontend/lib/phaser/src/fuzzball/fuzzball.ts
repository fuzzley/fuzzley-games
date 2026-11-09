// The fuzzball, `@fz/style`'s mark, in the shapes' commands: its strands of
// fur read from its path, its body and fur, outlined where a game asks and
// in fur a game may comb its own way, and its eyes, which a game draws in a
// frame of their own so its scene can turn them.

import { FUZZBALL } from "@fz/style/fuzzball";
import {
  type DrawCommand,
  type LineStyle,
  ORIGIN,
  type Point,
  circle,
  ellipsePoints,
  polygon,
  quadraticPoints,
  stroke,
} from "../shapes";

/** Describes one of the fuzzball's strands of fur: a curve from inside its body out to its tip, about its body's middle, on its grid. */
export interface Strand {
  readonly from: Point;
  readonly control: Point;
  readonly to: Point;
}

/** Says what the fuzzball's body and fur are drawn in. */
export interface FuzzballStyle {
  readonly color: number;
  /** An outline beneath the body and fur, its width wider all round. */
  readonly outline?: LineStyle;
  /** Its strands of fur, the fuzzball's own unless a game combs them its own way. */
  readonly fur?: readonly Strand[];
}

/** Says what the fuzzball's eyes are drawn in, and their glints, where a game wants them. */
export interface EyesStyle {
  readonly color: number;
  /** The glints' color; without it, the eyes have none. */
  readonly glint?: number;
}

/** How wide the fuzzball's grid is, its body and fur placed on it. */
export const FUZZBALL_GRID = 32;

/**
 * How far the fuzzball's eyes move toward what it looks at, across and
 * down, on its grid, so a scene moves its eyes' frame by these times the
 * way it looks.
 */
export const FUZZBALL_LOOK = { across: 1.3, down: 0.9 } as const;

/** The least radius of a glint drawn, in device pixels, below which it would only turn an eye grey. */
const LEAST_GLINT = 0.5;

/** Returns a point of the fuzzball's grid from its body's middle. */
export function aboutBody(point: Point): Point {
  return { x: point.x - FUZZBALL.body.cx, y: point.y - FUZZBALL.body.cy };
}

/**
 * Returns the fuzzball's strands of fur read from its path, each a move to
 * a point and a quadratic curve from it, about its body's middle.
 *
 * @throws {Error} for a strand drawn any other way.
 */
export function strandsOf(path: string): readonly Strand[] {
  return path
    .split("M")
    .slice(1)
    .map((strand) => {
      const [
        fromX = NaN,
        fromY = NaN,
        controlX = NaN,
        controlY = NaN,
        toX = NaN,
        toY = NaN,
        ...rest
      ] = strand.replace("Q", " ").split(" ").map(Number);
      if (
        rest.length > 0 ||
        [fromX, fromY, controlX, controlY, toX, toY].some(Number.isNaN)
      ) {
        throw new Error(
          `The fuzzball's fur has a strand it can't read: M${strand}`,
        );
      }
      return {
        from: aboutBody({ x: fromX, y: fromY }),
        control: aboutBody({ x: controlX, y: controlY }),
        to: aboutBody({ x: toX, y: toY }),
      };
    });
}

/** The fuzzball's own strands of fur, read from its path. */
export const FUZZBALL_STRANDS: readonly Strand[] = strandsOf(FUZZBALL.fur.d);

/**
 * Returns how far fur reaches from the body's middle, on the fuzzball's
 * grid: its furthest tip, and half a strand's width, as a strand is drawn
 * round at its ends.
 */
export function furReach(fur: readonly Strand[] = FUZZBALL_STRANDS): number {
  return (
    Math.max(...fur.map(({ to }) => Math.hypot(to.x, to.y))) +
    FUZZBALL.fur.width / 2
  );
}

/**
 * Returns the fuzzball's body and fur about its body's middle, `by` device
 * pixels to a unit of its grid: its outline first, all of it, where it has
 * one, then the body, then each strand round at its ends.
 */
export function fuzzballCommands(
  by: number,
  { color, outline, fur = FUZZBALL_STRANDS }: FuzzballStyle,
): readonly DrawCommand[] {
  const strands = fur.map(({ from, control, to }) => {
    const start = scaled(from, by);
    return [
      start,
      ...quadraticPoints(start, scaled(control, by), scaled(to, by)),
    ];
  });
  const body = FUZZBALL.body.r * by;
  const width = FUZZBALL.fur.width * by;
  const drawn = (ink: number, wider: number): readonly DrawCommand[] => [
    circle(ORIGIN, body + wider, { color: ink }),
    ...strands.flatMap((points) =>
      stroke(points, { color: ink, width: width + 2 * wider }),
    ),
  ];
  return outline
    ? [...drawn(outline.color, outline.width), ...drawn(color, 0)]
    : drawn(color, 0);
}

/**
 * Returns the fuzzball's eyes about its body's middle, `by` device pixels to
 * a unit of its grid, with their glints where it has them and each is half
 * a device pixel or more.
 */
export function eyesCommands(
  by: number,
  { color, glint }: EyesStyle,
): readonly DrawCommand[] {
  const eyes = FUZZBALL.eyes.map((eye) =>
    polygon(
      ellipsePoints(
        scaled(aboutBody({ x: eye.cx, y: eye.cy }), by),
        eye.rx * by,
        eye.ry * by,
      ),
      { color },
    ),
  );
  if (glint === undefined) return eyes;
  return [
    ...eyes,
    ...FUZZBALL.glints
      .filter((each) => each.r * by >= LEAST_GLINT)
      .map((each) =>
        circle(scaled(aboutBody({ x: each.cx, y: each.cy }), by), each.r * by, {
          color: glint,
        }),
      ),
  ];
}

/** Returns a point scaled by a factor. */
function scaled(point: Point, by: number): Point {
  return { x: point.x * by, y: point.y * by };
}
