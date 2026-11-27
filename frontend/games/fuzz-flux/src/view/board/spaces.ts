// The board's squares in the screen's frame, x across from the left and y
// down from the top, whichever way the wind has turned the board's own:
// which are on the board, the ways a square has neighbors, the square under
// a point on the canvas, and where a square lies there.

import type { Point } from "@fz/phaser/shapes";
import { type Square, indexOf } from "../../rules/board/cells";
import type { BoardMetrics } from "./metrics";

/**
 * Describes the board's squares as the screen shows them, its gaps among
 * them, which hold for the whole level, as the wind turns only the board's
 * own frame under the screen's.
 */
export interface BoardShape {
  readonly width: number;
  readonly height: number;
  /** Whether each square is open, there to hold a piece, by `y * width + x` on the screen: a gap's isn't. */
  readonly open: readonly boolean[];
}

/** Every way on the screen a square has a neighbor. */
export const WAYS = [
  "up",
  "right",
  "down",
  "left",
] as const satisfies readonly string[];

/** A way on the screen, such as "left". */
export type Way = (typeof WAYS)[number];

/** The step across and down to a square's neighbor each way. */
const STEPS: Readonly<Record<Way, Square>> = {
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
};

/** Returns whether a square lies inside a board's edges, a gap or not. */
export function isWithinEdges(board: BoardShape, { x, y }: Square): boolean {
  return x >= 0 && y >= 0 && x < board.width && y < board.height;
}

/** Returns whether a square is on a board: inside its edges, and no gap. */
export function isOnBoard(board: BoardShape, square: Square): boolean {
  return (
    isWithinEdges(board, square) &&
    board.open[indexOf(square, board.width)] === true
  );
}

/** Returns a square's neighbor a way on the screen, which may lie past the board's edges. */
export function neighborOf(square: Square, way: Way): Square {
  const step = STEPS[way];
  return { x: square.x + step.x, y: square.y + step.y };
}

/** Returns whether two squares are the same. */
export function sameSquare(a: Square, b: Square): boolean {
  return a.x === b.x && a.y === b.y;
}

/** Returns whether two squares are neighbors, side by side or one above the other. */
export function areNeighbors(a: Square, b: Square): boolean {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
}

/**
 * Returns the square under a point on the canvas, in device pixels, or null
 * for a point past the board's edges.
 *
 * A gap inside them is a square here, which {@link isOnBoard} tells from
 * one on the board.
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
