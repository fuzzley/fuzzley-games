// The pilots: `@fz/phaser`'s fuzzball in each pilot's ink, its eyes a frame
// of their own so the scene turns them toward what the pilot looks at; and
// the constellation that traces it among the specks.

import {
  FUZZBALL_GRID,
  FUZZBALL_LOOK,
  FUZZBALL_STRANDS,
  aboutBody,
  eyesCommands as eyesOnGrid,
  fuzzballCommands as fuzzballOnGrid,
} from "@fz/phaser/fuzzball";
import {
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  type Point,
  centered,
} from "@fz/phaser/shapes";
import { FUZZBALL } from "@fz/style/fuzzball";
import { PILOT_COLORS, type Pilot } from "../../rules/ship/pilots";
import type { Moving, Place } from "../../rules/torus";
import { STRAY_RADIUS } from "../../rules/tuning";
import type { BeltPalette } from "../colors/palette";
import { WINDOW } from "./ship_art";

/** Names where a pilot is drawn: in the ship's window, or adrift in a stray's bubble or bailing out. */
export type Seat = "seated" | "adrift";

/** Every seat a pilot is drawn in. */
export const SEATS: readonly Seat[] = ["seated", "adrift"];

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
export const LOOK = {
  across: FUZZBALL_LOOK.across / FUZZBALL_GRID,
  down: FUZZBALL_LOOK.down / FUZZBALL_GRID,
} as const;

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

/**
 * Where the constellation's specks lie, the tips of every other one of the
 * fuzzball's strands, and its eyes' two, as shares of its size from its
 * body's middle.
 */
export const CONSTELLATION: {
  readonly specks: readonly Point[];
  readonly eyes: readonly Point[];
} = {
  specks: FUZZBALL_STRANDS.filter((_, i) => i % 2 === 0).map(({ to }) =>
    asShare(to),
  ),
  eyes: FUZZBALL.eyes.map((eye) =>
    asShare(aboutBody({ x: eye.cx, y: eye.cy })),
  ),
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

/** Returns a point about the fuzzball's body's middle, on its grid, as a share of its size. */
function asShare(point: Point): Point {
  return { x: point.x / FUZZBALL_GRID, y: point.y / FUZZBALL_GRID };
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
  return fuzzballOnGrid(size / FUZZBALL_GRID, { color });
}

/** Returns the fuzzball's eyes about its body's middle, a size across its grid, with their glints where each is large enough to see. */
export function eyesCommands(
  size: number,
  palette: BeltPalette,
): readonly DrawCommand[] {
  return eyesOnGrid(size / FUZZBALL_GRID, {
    color: palette.eyes,
    glint: palette.glint,
  });
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
