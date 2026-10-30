import { clamp } from "@fz/core/math";
import { landing } from "../rules/arena";
import { type Direction, type Square, sameSquare } from "../rules/geometry";
import type { BoardMetrics } from "./board_metrics";
import { centerX, centerY } from "./board_metrics";
import type { SnakeFrame } from "./frame";

/** How wide the snake's body is, as a share of a square. */
const BODY_WIDTH = 0.64;

/** How big the head is, as a share of the body's width. */
const HEAD_SCALE = 1.2;

/** How far forward of the head's center its eyes sit, as a share of a square. */
const EYE_FORWARD = 0.14;

/** How far apart the eyes sit either side, as a share of a square. */
const EYE_SPREAD = 0.18;

/** How big an eye is, as a share of a square. */
const EYE_RADIUS = 0.075;

/** Which way along each axis a direction goes. */
const AXES: Readonly<Record<Direction, readonly [number, number]>> = {
  up: [0, -1],
  right: [1, 0],
  down: [0, 1],
  left: [-1, 0],
};

/**
 * Holds the snake as the scene draws it: the line its body runs along,
 * through the head, each bend and the tail, and the head and its eyes, in
 * device pixels. The painter keeps one and {@link snakeShapes} rewrites it
 * each frame, so drawing a frame allocates nothing.
 */
export class SnakeShapes {
  /** How many points the body's line runs through. */
  count = 0;
  /** The points' x, head first. */
  readonly xs: Float64Array;
  /** The points' y, head first. */
  readonly ys: Float64Array;
  /** How wide the body is. */
  width = 0;
  /** The head's center, the first point, and its radius. */
  readonly head = { x: 0, y: 0, radius: 0 };
  /** The eyes' centers, left then right as the snake sees them. */
  readonly eyes = { x1: 0, y1: 0, x2: 0, y2: 0, radius: 0 };

  // The last two points, to fold a point that runs straight on into them.
  private lastX = 0;
  private lastY = 0;
  private beforeX = 0;
  private beforeY = 0;

  constructor(capacity: number) {
    this.xs = new Float64Array(capacity + 2);
    this.ys = new Float64Array(capacity + 2);
  }

  /** Forgets every point. */
  clear(): void {
    this.count = 0;
  }

  /** Adds a point, folding it into the last one where the line runs straight on. */
  add(x: number, y: number): void {
    const n = this.count;
    if (n > 0 && this.lastX === x && this.lastY === y) return;
    const straight =
      n >= 2 &&
      ((this.beforeX === this.lastX && this.lastX === x) ||
        (this.beforeY === this.lastY && this.lastY === y));
    if (straight) {
      this.xs[n - 1] = x;
      this.ys[n - 1] = y;
    } else {
      this.xs[n] = x;
      this.ys[n] = y;
      this.count = n + 1;
      this.beforeX = this.lastX;
      this.beforeY = this.lastY;
    }
    this.lastX = x;
    this.lastY = y;
  }
}

/**
 * Writes the snake of a frame into `out`, as the board's metrics place it.
 *
 * While the snake glides, its head eases toward the square it steps to next,
 * the first turn queued's or its heading's, and its tail toward the square
 * after it, unless the snake grows on that step and the tail stays. A head
 * about to run into the wall waits on its square.
 */
export function snakeShapes(
  { run, progress }: SnakeFrame,
  metrics: BoardMetrics,
  out: SnakeShapes,
): SnakeShapes {
  out.clear();
  const { snake } = run;
  const last = snake.length - 1;
  if (last < 0) return out;
  const head = nth(snake, 0);
  const glide = run.outcome === "playing" ? clamp(progress, 0, 1) : 0;
  const heading = glide > 0 ? (run.turns[0] ?? run.heading) : run.heading;
  const next = glide > 0 ? landing(head, heading, run.size) : null;
  const grows =
    next !== null && run.apple !== null && sameSquare(next, run.apple);

  const hx = centerX(metrics, head);
  const hy = centerY(metrics, head);
  out.head.x = next ? hx + (centerX(metrics, next) - hx) * glide : hx;
  out.head.y = next ? hy + (centerY(metrics, next) - hy) * glide : hy;
  out.add(out.head.x, out.head.y);
  out.add(hx, hy);
  for (let i = 1; i < last; i++) {
    const square = nth(snake, i);
    out.add(centerX(metrics, square), centerY(metrics, square));
  }
  if (last > 0) {
    const tail = nth(snake, last);
    const toward = nth(snake, last - 1);
    const tx = centerX(metrics, tail);
    const ty = centerY(metrics, tail);
    const moves = next !== null && !grows;
    out.add(
      moves ? tx + (centerX(metrics, toward) - tx) * glide : tx,
      moves ? ty + (centerY(metrics, toward) - ty) * glide : ty,
    );
  }

  const square = metrics.square;
  out.width = Math.max(1, Math.round(square * BODY_WIDTH));
  out.head.radius = (out.width / 2) * HEAD_SCALE;
  const axis = AXES[heading];
  const ax = axis[0];
  const ay = axis[1];
  const cx = out.head.x + ax * square * EYE_FORWARD;
  const cy = out.head.y + ay * square * EYE_FORWARD;
  // Across the heading, to the snake's left and then its right.
  out.eyes.x1 = cx + ay * square * EYE_SPREAD;
  out.eyes.y1 = cy - ax * square * EYE_SPREAD;
  out.eyes.x2 = cx - ay * square * EYE_SPREAD;
  out.eyes.y2 = cy + ax * square * EYE_SPREAD;
  out.eyes.radius = Math.max(1, square * EYE_RADIUS);
  return out;
}

/**
 * Returns the square of a snake at an index it has, read by index, since
 * destructuring takes an iterator, which allocates.
 */
function nth(snake: readonly Square[], index: number): Square {
  const square = snake[index];
  if (!square) throw new RangeError(`The snake has no square ${index}`);
  return square;
}
