// What each of the board's painters draws a frame from, where a place on
// the board, in squares, lies on the canvas, how far past the canvas what
// covers it reaches, and how an image takes a color.

import type { ArtScale } from "@fz/phaser/shapes";
import type { GameObjects } from "phaser";
import type { BoardMetrics } from "../../view/board/metrics";
import type { BoardPalette } from "../../view/colors/palette";
import type { Frame } from "../../view/timeline/sample";
import type { BoardPlay, PlayClock } from "../play_clock";

/** Says what a frame of the board is drawn from: a record the scene writes over each frame. */
export interface PaintContext {
  /** The play the board draws. */
  play: BoardPlay;
  /** Where everything the play's timeline draws stands at the frame's moment. */
  frame: Frame;
  /** The scene's clock, and where the play stands on it. */
  readonly clock: PlayClock;
  /** Where the board lies on the canvas. */
  metrics: BoardMetrics;
  /** How many device pixels a CSS pixel is. */
  pixelRatio: number;
  /** The scale the atlas was last baked at, which each of its frames is shown at the board's square from. */
  baked: ArtScale;
  /** The palette the atlas was last baked in. */
  palette: BoardPalette;
}

/** How far past the canvas what covers it reaches, in device pixels, so a shaken board shows no edge of it. */
export const PAST_CANVAS = 1 << 16;

/** Draws a part of the board, in the layers it was given, each frame. */
export interface Painter {
  draw(context: Readonly<PaintContext>): void;
}

/** Returns where a place across the board, in squares from its first square's middle, lies on the canvas, in device pixels. */
export function acrossOf(metrics: BoardMetrics, x: number): number {
  return metrics.x + (x + 0.5) * metrics.square;
}

/** Returns where a place down the board, in squares from its first square's middle, lies on the canvas, in device pixels. */
export function downOf(metrics: BoardMetrics, y: number): number {
  return metrics.y + (y + 0.5) * metrics.square;
}

/** Returns how far a frame of the atlas is scaled to show at the board's square, as it was baked for another. */
export function shownScale({ metrics, baked }: Readonly<PaintContext>): number {
  return metrics.square / baked.unit;
}

/** Tints an image in a color, over its own, where it is tinted in another. */
export function tintIn(image: GameObjects.Image, color: number): void {
  if (image.tint !== color) image.setTint(color);
}
