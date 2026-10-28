import type { Insets } from "@fz/phaser/insets";
import type { Square } from "../rules/geometry";

/** Describes the canvas a board is laid out on. */
export interface Viewport {
  /** The canvas's width, in device pixels. */
  readonly width: number;
  /** The canvas's height, in device pixels. */
  readonly height: number;
  /** Device pixels to a CSS pixel. */
  readonly pixelRatio: number;
  /** How far the app's chrome lies over each edge, in CSS pixels. */
  readonly insets: Insets;
}

/** A rectangle on the canvas, in CSS pixels from its top left. */
export interface BoardRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

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
  readonly css: BoardRect;
}

/** How thick the wall around the board is, in CSS pixels. */
export const WALL_CSS_PX = 2;

/**
 * Returns where a board lies on a canvas: the largest square that fits
 * inside the chrome with room for its wall, each square a whole number of
 * device pixels so the checker's edges are sharp, centered on whole pixels.
 */
export function boardMetrics(viewport: Viewport, size: number): BoardMetrics {
  const { width, height, pixelRatio, insets } = viewport;
  const wall = Math.max(1, Math.round(WALL_CSS_PX * pixelRatio));
  const left = Math.round(insets.left * pixelRatio);
  const top = Math.round(insets.top * pixelRatio);
  const across = width - left - Math.round(insets.right * pixelRatio);
  const down = height - top - Math.round(insets.bottom * pixelRatio);
  const square = Math.max(
    1,
    Math.floor((Math.min(across, down) - 2 * wall) / size),
  );
  const side = square * size;
  const x = left + Math.floor((across - side) / 2);
  const y = top + Math.floor((down - side) / 2);
  return {
    size,
    square,
    x,
    y,
    side,
    wall,
    css: {
      x: x / pixelRatio,
      y: y / pixelRatio,
      width: side / pixelRatio,
      height: side / pixelRatio,
    },
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
