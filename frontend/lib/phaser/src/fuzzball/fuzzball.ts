// The fuzzball, `@fz/style`'s mark and the faces, look and fur it poses,
// in the shapes' commands: its body and fur, outlined where a game asks, as
// one with what it wears where it wears something, and in fur combed by
// `combedStrands()`, `@fz/style`'s `combFur()` or a game's own way; its
// eyes at any face, which a game draws in a frame of their own so its scene
// can turn them.

import {
  type EyeMark,
  type EyesPose,
  FUZZBALL,
  FUZZBALL_STRANDS,
  type Strand,
  eyesOf,
} from "@fz/style/fuzzball";
import {
  type DrawCommand,
  type LineStyle,
  ORIGIN,
  type Point,
  circle,
  ellipsePoints,
  extentOf,
  placed,
  polygon,
  quadraticPoints,
  stroke,
} from "../shapes";

export {
  FUZZBALL_GRID,
  FUZZBALL_LOOK,
  FUZZBALL_STRANDS,
  type Strand,
  aboutBody,
  strandsOf,
} from "@fz/style/fuzzball";

/** Says what the fuzzball's body and fur are drawn in. */
export interface FuzzballStyle {
  readonly color: number;
  /** An outline beneath the body and fur, its width wider all round. */
  readonly outline?: LineStyle;
  /** Its strands of fur, the fuzzball's own unless combed, by `combedStrands()`, `combFur()` or a game's own way. */
  readonly fur?: readonly Strand[];
  /** How wide each strand is, on the grid: the mark's unless given, such as `SMALL_FUR_WIDTH` for the small form. */
  readonly furWidth?: number;
}

/**
 * Describes what a fuzzball wears, such as sparks or flames, which its
 * outline takes in as one with it: the outlines of its parts, the parts
 * that lie beneath its body and fur, and those that lie over them.
 */
export interface Worn {
  /** The outlines of what it wears, drawn over the fuzzball's own and beneath all the rest. */
  readonly outlines?: readonly DrawCommand[];
  /** What lies beneath its body and fur. */
  readonly beneath?: readonly DrawCommand[];
  /** What lies over its body and fur. */
  readonly over?: readonly DrawCommand[];
}

/** Says what the fuzzball's eyes are drawn in, and their glints, where a game wants them. */
export interface EyesStyle {
  readonly color: number;
  /** The glints' color; without it, the eyes have none. */
  readonly glint?: number;
}

/** How many device pixels across a glint is drawn at the least, at its narrowest, below which it would only turn an eye grey. */
const LEAST_GLINT = 1;

/**
 * Returns how far fur reaches from the body's middle, on the fuzzball's
 * grid: its furthest tip, and half a strand's width, the mark's unless
 * given, as a strand is drawn round at its ends.
 */
export function furReach(
  fur: readonly Strand[] = FUZZBALL_STRANDS,
  width: number = FUZZBALL.fur.width,
): number {
  return Math.max(...fur.map(({ to }) => Math.hypot(to.x, to.y))) + width / 2;
}

/**
 * Returns the fuzzball's body and fur about its body's middle, `by` device
 * pixels to a unit of its grid: its outline first, all of it, where it has
 * one, then the body, then each strand round at its ends.
 */
export function fuzzballCommands(
  by: number,
  style: FuzzballStyle,
): readonly DrawCommand[] {
  return fuzzballWearing(by, style, {});
}

/**
 * Returns the fuzzball's body and fur about its body's middle, `by` device
 * pixels to a unit of its grid, outlined as one with what it wears: its
 * outline first, all of it, where it has one, then the outlines of what it
 * wears, then what lies beneath its body, then the body and each strand
 * round at its ends, then what lies over them, so no outline covers any of
 * it.
 */
export function fuzzballWearing(
  by: number,
  {
    color,
    outline,
    fur = FUZZBALL_STRANDS,
    furWidth = FUZZBALL.fur.width,
  }: FuzzballStyle,
  { outlines = [], beneath = [], over = [] }: Worn,
): readonly DrawCommand[] {
  const strands = fur.map(({ from, control, to }) => {
    const start = scaled(from, by);
    return [
      start,
      ...quadraticPoints(start, scaled(control, by), scaled(to, by)),
    ];
  });
  const body = FUZZBALL.body.r * by;
  const width = furWidth * by;
  const drawn = (ink: number, wider: number): readonly DrawCommand[] => [
    circle(ORIGIN, body + wider, { color: ink }),
    ...strands.flatMap((points) =>
      stroke(points, { color: ink, width: width + 2 * wider }),
    ),
  ];
  return [
    ...(outline ? drawn(outline.color, outline.width) : []),
    ...outlines,
    ...beneath,
    ...drawn(color, 0),
    ...over,
  ];
}

/**
 * Returns the fuzzball's eyes at a pose about its body's middle, `by`
 * device pixels to a unit of its grid: the mark's own at rest, looking
 * straight out, unless the pose says otherwise (`@fz/style`'s `eyesOf()`),
 * their glints over them where it has them and each, the whole of it, is a
 * device pixel or more across at its narrowest.
 *
 * A game that moves the eyes' frame as its fuzzball looks bakes them with
 * no look, `{ x: 0, y: 0 }`, and moves the frame by `lookOffset()` of the
 * look, or of the face's own (`restingLook()`), times `by`.
 */
export function eyesCommands(
  by: number,
  { color, glint }: EyesStyle,
  pose: EyesPose = {},
): readonly DrawCommand[] {
  return eyesOf(pose).flatMap((mark) => {
    if (mark.tone === "eye") return markCommands(mark, by, color);
    if (glint === undefined) return [];
    const drawn = markCommands(mark, by, glint);
    return drawn.every((command) => {
      const { width, height } = extentOf(command);
      return Math.min(width, height) >= LEAST_GLINT;
    })
      ? drawn
      : [];
  });
}

/** Returns the commands of a mark of a face, `by` device pixels to a unit of the grid, in a color: an ellipse whose radii agree as a circle. */
function markCommands(
  mark: EyeMark,
  by: number,
  color: number,
): readonly DrawCommand[] {
  switch (mark.kind) {
    case "ellipse":
      return [
        mark.rx === mark.ry
          ? circle(scaled(mark.at, by), mark.rx * by, { color })
          : polygon(
              ellipsePoints(scaled(mark.at, by), mark.rx * by, mark.ry * by),
              { color },
            ),
      ];
    case "polygon":
      return [polygon(placed(mark.points, by), { color })];
    case "stroke":
      return stroke(placed(mark.points, by), { color, width: mark.width * by });
  }
}

/** Returns a point scaled by a factor. */
function scaled(point: Point, by: number): Point {
  return { x: point.x * by, y: point.y * by };
}
