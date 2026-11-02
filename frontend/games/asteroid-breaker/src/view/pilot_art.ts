// The pilots: the fuzzball, from `@fz/style`'s shapes, in each pilot's ink,
// its eyes a frame of their own so the scene turns them toward what the
// pilot looks at; and the constellation that traces it among the specks.

import { FUZZBALL } from "@fz/style/fuzzball";
import { PILOT_COLORS, type Pilot } from "../rules/pilots";
import type { Moving, Place } from "../rules/torus";
import { STRAY_RADIUS } from "../rules/tuning";
import type { BeltPalette } from "./palette";
import {
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  type Point,
  centered,
  circle,
  ellipsePoints,
  polygon,
  quadraticPoints,
  stroke,
} from "./shapes";
import { WINDOW } from "./ship_art";

/** Names where a pilot is drawn: in the ship's window, or adrift in a stray's bubble or bailing out. */
export type Seat = "seated" | "adrift";

/** Every seat a pilot is drawn in. */
export const SEATS: readonly Seat[] = ["seated", "adrift"];

/** Describes one of the fuzzball's strands of fur: a curve from inside its body out to its tip, on its grid. */
interface Strand {
  readonly from: Point;
  readonly control: Point;
  readonly to: Point;
}

/** How wide the fuzzball's grid is, its body and fur placed on it. */
const GRID = 32;

/** The least radius of a glint drawn, in device pixels, below which it would only turn an eye grey. */
const LEAST_GLINT = 0.5;

/** How wide a pilot is drawn in each seat, across the fuzzball's grid, in field units. */
export const PILOT_SIZES: Readonly<Record<Seat, number>> = {
  // As wide as the window it sits in.
  seated: 2 * WINDOW.radius,
  adrift: 1.55 * STRAY_RADIUS,
};

/**
 * How far a pilot's eyes move toward what it looks at, across and down, as
 * shares of the pilot's size, so the scene moves its eyes' frame by these
 * times the way it looks.
 */
export const LOOK = { across: 1.3 / GRID, down: 0.9 / GRID } as const;

/**
 * Writes the way a pilot at a place looks into a record and returns it, a
 * share along each axis: straight at what it watches, the ship, the way
 * the Magnet would draw it, or along its heading where it watches nothing
 * or what it watches is right there.
 */
export function lookingFrom(
  x: number,
  y: number,
  watched: Place | null,
  heading: number,
  into: Moving,
): Moving {
  const dx = watched ? watched.x - x : 0;
  const dy = watched ? watched.y - y : 0;
  const far = Math.hypot(dx, dy);
  into.x = far > 0 ? dx / far : Math.cos(heading);
  into.y = far > 0 ? dy / far : Math.sin(heading);
  return into;
}

/** The fuzzball's strands of fur, read from its path. */
const STRANDS: readonly Strand[] = strandsOf(FUZZBALL.fur.d);

/**
 * Where the constellation's specks lie, the tips of every other one of the
 * fuzzball's strands, and its eyes' two, as shares of its size from its
 * body's middle.
 */
export const CONSTELLATION: {
  readonly specks: readonly Point[];
  readonly eyes: readonly Point[];
} = {
  specks: STRANDS.filter((_, i) => i % 2 === 0).map((strand) =>
    onGrid(strand.to, 1 / GRID),
  ),
  eyes: FUZZBALL.eyes.map((eye) => onGrid({ x: eye.cx, y: eye.cy }, 1 / GRID)),
};

// Made once, so finding a frame's name makes nothing.
const PILOT_FRAMES: Readonly<Record<Seat, readonly string[]>> = {
  seated: pilotNames("seated"),
  adrift: pilotNames("adrift"),
};
const EYES_FRAMES: Readonly<Record<Seat, string>> = {
  seated: "eyes-seated",
  adrift: "eyes-adrift",
};

/** Returns the names of a seat's pilots' frames, one for each pilot's color. */
function pilotNames(seat: Seat): readonly string[] {
  return Array.from(
    { length: PILOT_COLORS },
    (_, pilot) => `pilot-${seat}-${String(pilot)}`,
  );
}

/**
 * Returns the fuzzball's strands of fur read from its path, each a move to
 * a point and a quadratic curve from it.
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
        from: { x: fromX, y: fromY },
        control: { x: controlX, y: controlY },
        to: { x: toX, y: toY },
      };
    });
}

/** Returns a point of the fuzzball's grid from its body's middle, scaled by a factor. */
function onGrid(point: Point, by: number): Point {
  return {
    x: (point.x - FUZZBALL.body.cx) * by,
    y: (point.y - FUZZBALL.body.cy) * by,
  };
}

/** Returns the name of a pilot's frame in a seat, its body and fur in its ink. */
export function pilotFrame(pilot: Pilot, seat: Seat): string {
  const name = PILOT_FRAMES[seat][pilot];
  if (name === undefined) {
    throw new RangeError(`No pilot has color ${String(pilot)}`);
  }
  return name;
}

/** Returns the name of the frame of a pilot's eyes in a seat. */
export function eyesFrame(seat: Seat): string {
  return EYES_FRAMES[seat];
}

/** Returns the fuzzball's body and fur about its body's middle, a size across its grid, in a color. */
export function fuzzballCommands(
  size: number,
  color: number,
): readonly DrawCommand[] {
  const by = size / GRID;
  const width = FUZZBALL.fur.width * by;
  return [
    circle(0, 0, FUZZBALL.body.r * by, color),
    // Each strand round at its ends, as the fuzzball's path caps it.
    ...STRANDS.flatMap(({ from, control, to }) => {
      const start = onGrid(from, by);
      return stroke(
        [start, ...quadraticPoints(start, onGrid(control, by), onGrid(to, by))],
        width,
        color,
      );
    }),
  ];
}

/** Returns the fuzzball's eyes about its body's middle, a size across its grid, with their glints where each is large enough to see. */
export function eyesCommands(
  size: number,
  palette: BeltPalette,
): readonly DrawCommand[] {
  const by = size / GRID;
  const glints = FUZZBALL.glints.filter((glint) => glint.r * by >= LEAST_GLINT);
  return [
    ...FUZZBALL.eyes.map((eye) => {
      const middle = onGrid({ x: eye.cx, y: eye.cy }, by);
      return polygon(
        ellipsePoints(middle.x, middle.y, eye.rx * by, eye.ry * by),
        palette.eyes,
      );
    }),
    ...glints.map((glint) => {
      const middle = onGrid({ x: glint.cx, y: glint.cy }, by);
      return circle(middle.x, middle.y, glint.r * by, palette.glint);
    }),
  ];
}

/** Returns the frames of every pilot in each seat, and of their eyes. */
export function pilotFrames(
  palette: BeltPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  return SEATS.flatMap((seat) => {
    const size = PILOT_SIZES[seat] * scale.unit;
    return [
      ...palette.pilots.map((ink, pilot) =>
        centered(pilotFrame(pilot, seat), fuzzballCommands(size, ink)),
      ),
      centered(eyesFrame(seat), eyesCommands(size, palette)),
    ];
  });
}
