// How a line of wind crosses the board a share through its crossing, as
// the sketch draws it: a stroke along the way the wind blows, setting off a
// little way on from where it set out and running on, growing as it goes,
// fading in and then out, and cut off a little past the board's edge, where
// a dasher's streak is cut off.

import { clamp } from "@fz/core/math";
import { WAYS } from "../timeline/events/fall";
import type { Effect } from "../timeline/timeline";
import { reachAlong } from "./flourishes";

/** A line of wind as an effect. */
export type GustLine = Extract<Effect, { readonly what: "gust-line" }>;

/** How far on from where it set out a line's far end lies as it sets out, in squares, and how much further it runs by the end of its crossing. */
const FAR = { start: 1.2, run: 2.4 } as const;

/** How far toward its far end from where it set out a line's near end lies, as a share of the way. */
const NEAR = 0.4;

/** How opaque a line is halfway through its crossing, at its most. */
const MOST_ALPHA = 0.6;

/** How long a line of wind is at the end of its crossing, in squares: the longest it is drawn. */
export const LONGEST_GUST_LINE = (FAR.start + FAR.run) * (1 - NEAR);

/**
 * Describes a line of wind as it crosses: where its middle is, in squares,
 * the way it points, in radians clockwise from the right, how long it is,
 * in squares, how much of that shows, and how opaque.
 */
export interface GustLineRun {
  x: number;
  y: number;
  angle: number;
  length: number;
  /** How much of its length shows from its near end, as a share: all but what has run past the clip beyond the board's edge. */
  shown: number;
  alpha: number;
}

/** Writes where a line of wind is a share through its crossing, on a board of a size in squares, into a record, and returns it. */
export function gustLineAt(
  line: GustLine,
  done: number,
  board: { readonly width: number; readonly height: number },
  into: GustLineRun,
): GustLineRun {
  const { at } = line;
  const way = WAYS[line.blows];
  const far = FAR.start + FAR.run * done;
  const near = far * NEAR;
  const reach = Math.min(
    reachAlong(at.x, way.x, board.width),
    reachAlong(at.y, way.y, board.height),
  );
  into.x = at.x + (way.x * (near + far)) / 2;
  into.y = at.y + (way.y * (near + far)) / 2;
  into.angle = Math.atan2(way.y, way.x);
  into.length = far - near;
  into.shown = clamp((reach - near) / (far - near), 0, 1);
  into.alpha = Math.sin(done * Math.PI) * MOST_ALPHA;
  return into;
}
