import { type CssRect, type Viewport, fitCells } from "@fz/phaser/layout";
import type { Square } from "../rules/geometry";

/** Says where a board lies on the canvas. */
export interface BoardMetrics {
  /** How many squares the board has across, and down. */
  readonly size: number;
  /** A square's side, in whole device pixels. */
  readonly square: number;
  /** The board's left edge, in whole device pixels. */
  readonly x: number;
  /** The board's top edge, in whole device pixels. */
  readonly y: number;
  /** The board's side, in device pixels. */
  readonly side: number;
  /** How thick the wall around it is, in whole device pixels. */
  readonly wall: number;
  /** The board, without its wall, in CSS pixels. */
  readonly css: CssRect;
}

/** How thick the wall around the board is, in CSS pixels. */
export const WALL_CSS_PX = 2;

/**
 * Returns where a board lies on a canvas: the largest square that fits
 * inside the chrome with room for its wall, each square a whole number of
 * device pixels so the checker's edges are sharp, centered on whole pixels.
 */
export function boardMetrics(viewport: Viewport, size: number): BoardMetrics {
  const fit = fitCells(viewport, {
    across: size,
    down: size,
    frameCss: WALL_CSS_PX,
  });
  return {
    size,
    square: fit.cell,
    x: fit.x,
    y: fit.y,
    side: fit.width,
    wall: fit.frame,
    css: fit.css,
  };
}

/** Returns the x of a square's center, in device pixels. */
export function centerX(metrics: BoardMetrics, square: Square): number {
  return metrics.x + (square.x + 0.5) * metrics.square;
}

/** Returns the y of a square's center, in device pixels. */
export function centerY(metrics: BoardMetrics, square: Square): number {
  return metrics.y + (square.y + 0.5) * metrics.square;
}
