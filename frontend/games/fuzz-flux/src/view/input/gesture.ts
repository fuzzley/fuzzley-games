// A press on the board, a finger's or the mouse's, read as the player meant
// it: one swipe a press, once it runs far enough along its longer axis, or
// a tap where it ends short of that.

import type { Point } from "@fz/phaser/shapes";
import type { BoardMetrics } from "../board/metrics";
import type { Way } from "../board/spaces";
import type { FeelTuning } from "../timeline/feel";

/** What a press reads as: the way it swipes, or a tap. */
export type PressRead = Way | "tap";

/** Describes a press under way. */
interface Press {
  readonly from: Point;
  /** How far it runs along an axis before it swipes, in device pixels. */
  readonly swipeLength: number;
  swiped: boolean;
}

/**
 * Reads each press on the board as a swipe or a tap: it swipes once, the
 * way it runs along its longer axis, as soon as it runs the feel's
 * `swipeSquares` of a square that way, and one that ends without swiping
 * was a tap.
 */
export class PressReader {
  /** The press under way, or null between presses. */
  private press: Press | null = null;

  /**
   * Starts a press at a point on the canvas, in device pixels, on a board
   * laid out by `metrics`, to swipe at the feel's `swipeSquares` of its
   * square.
   */
  start(from: Point, metrics: BoardMetrics, feel: FeelTuning): void {
    this.press = {
      from,
      swipeLength: feel.swipeSquares * metrics.square,
      swiped: false,
    };
  }

  /**
   * Returns the way the press under way swipes as it moves to a point, the
   * first time it has run far enough along its longer axis; or null before
   * then, after, and between presses.
   */
  move(to: Point): Way | null {
    const press = this.press;
    if (press === null || press.swiped) return null;
    const dx = to.x - press.from.x;
    const dy = to.y - press.from.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < press.swipeLength) return null;
    press.swiped = true;
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
    return dy > 0 ? "down" : "up";
  }

  /**
   * Ends the press under way at a point, and returns what it read as there:
   * the way it swipes, where it first runs far enough as it ends; a tap,
   * where it never swiped; or null, where it swiped before, and between
   * presses.
   */
  end(at: Point): PressRead | null {
    const tapped = this.press !== null && !this.press.swiped;
    const way = this.move(at);
    this.press = null;
    return way ?? (tapped ? "tap" : null);
  }

  /** Forgets the press under way, reading it as nothing, as when the browser takes a finger away. */
  cancel(): void {
    this.press = null;
  }
}
