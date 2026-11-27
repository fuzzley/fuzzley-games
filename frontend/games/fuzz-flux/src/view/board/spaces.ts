// The board's squares in the screen's frame, x across from the left and y
// down from the top, whichever way the wind has turned the board's own: the
// ways a square has neighbors, the square under a point on the canvas, and
// where a square lies there.

import type { Point } from "@fz/phaser/shapes";
import type { Square } from "../../rules/board/cells";
import type { BoardMetrics } from "./metrics";

/** Every way on the screen a square has a neighbor. */
export const WAYS = [
  "up",
  "right",
  "down",
  "left",
] as const satisfies readonly string[];

/** A way on the screen, such as "left". */
export type Way = (typeof WAYS)[number];

/**
 * Returns the square under a point on the canvas, in device pixels, or null
 * for a point past the board's edges.
 *
 * A gap inside them is a square here: only the board in play knows it for
 * one.
 */
export function squareAt(metrics: BoardMetrics, point: Point): Square | null {
  const across = point.x - metrics.x;
  const down = point.y - metrics.y;
  if (
    across < 0 ||
    down < 0 ||
    across >= metrics.width ||
    down >= metrics.height
  ) {
    return null;
  }
  return {
    x: Math.floor(across / metrics.square),
    y: Math.floor(down / metrics.square),
  };
}

/** Returns where a square's middle lies on the canvas, in device pixels. */
export function middleOf(metrics: BoardMetrics, square: Square): Point {
  return {
    x: metrics.x + (square.x + 0.5) * metrics.square,
    y: metrics.y + (square.y + 0.5) * metrics.square,
  };
}
