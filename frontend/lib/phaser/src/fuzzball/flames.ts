// The hot shot's crown of flame, four tongues rising from behind the
// fuzzball's body, as a fuzzball wears them, after `flame()` and `hotShot()`
// in `docs/archive/brick-fuzz-pop/art/make-art.mjs`, and a tongue of it on
// its own, for a fire of a game's own.

import {
  type LineStyle,
  type Point,
  placed,
  polygon,
  stroke,
  turned,
} from "../shapes";
import type { Worn } from "./fuzzball";

/** Describes a tongue of flame, about the point it is drawn about. */
export interface Flame {
  /** Which way it points from the point, in degrees clockwise from its right. */
  readonly turn: number;
  /** How far its root is from the point. */
  readonly from: number;
  /** How far its tip is from the point. */
  readonly to: number;
  /** What its width is drawn to: 0.7 of it at its root, swelling to about five sixths of it, then narrowing to its tip. */
  readonly width: number;
  /** How far its tip leans aside, clockwise. */
  readonly lean: number;
}

/** The hot shot's crown of flame, from its left to its right, about the body's middle on the fuzzball's grid. */
const FLAMES = [
  { turn: -129, to: 20, width: 8.6, lean: 3 },
  { turn: -104, to: 24, width: 9.6, lean: 1.2 },
  { turn: -78, to: 21.6, width: 9, lean: -2.6 },
  { turn: -53, to: 19.2, width: 8.2, lean: -3 },
] as const satisfies readonly Omit<Flame, "from">[];

/** How far from the body's middle a tongue of the hot shot's flame rises, from behind the body, on the fuzzball's grid. */
const FLAME_FROM = 11.5;

/** How many steps each side of a tongue of flame takes from its root to its tip. */
const FLAME_STEPS = 8;

/**
 * Returns a tongue of flame as a polygon's points about the point it is
 * drawn about: it rises from its root, swells, then leans as it narrows to
 * its tip.
 */
export function flameTongue({
  turn,
  from,
  to,
  width,
  lean,
}: Flame): readonly Point[] {
  const left: Point[] = [];
  const right: Point[] = [];
  for (let step = 0; step <= FLAME_STEPS; step++) {
    const t = step / FLAME_STEPS;
    const along = from + (to - from) * t;
    const half =
      (width / 2) * (1 - t) ** 1.2 * (0.7 + 0.65 * Math.sin(Math.PI * t));
    left.push({ x: along, y: lean * t * t - half });
    right.push({ x: along, y: lean * t * t + half });
  }
  return [...left, ...right.reverse().slice(1)].map((point) =>
    turned(point, turn),
  );
}

/** The hot shot's tongues of flame, made once, on the fuzzball's grid. */
const TONGUES: readonly (readonly Point[])[] = FLAMES.map((flame) =>
  flameTongue({ ...flame, from: FLAME_FROM }),
);

/**
 * Returns the hot shot's crown of flame about the fuzzball's body's middle
 * as a fuzzball wears it, `by` device pixels to a unit of its grid, for
 * `fuzzballWearing()` to outline as one with it: each tongue filled in a
 * color beneath its body and fur, and its outline a closed line round it in
 * the outline's color, the outline's width either side of its edge.
 */
export function wornFlames(
  by: number,
  color: number,
  outline: LineStyle,
): Worn {
  const tongues = TONGUES.map((points) => placed(points, by));
  return {
    outlines: tongues.flatMap((points) =>
      stroke([...points, ...points.slice(0, 1)], {
        color: outline.color,
        width: 2 * outline.width,
      }),
    ),
    beneath: tongues.map((points) => polygon(points, { color })),
  };
}
