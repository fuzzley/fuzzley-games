// What each of the board's painters draws a frame from, where a place on
// the board, in squares, lies on the canvas, how far past the canvas what
// covers it reaches, how an image takes a color, and how a sprite's image
// shows where its track is sampled.

import type { CssRect } from "@fz/phaser/layout";
import type { ArtScale } from "@fz/phaser/shapes";
import type { GameObjects } from "phaser";
import { opacityOf } from "../../view/art/piece_look";
import type { BoardMetrics } from "../../view/board/metrics";
import type { BoardPalette } from "../../view/colors/palette";
import type { Frame } from "../../view/timeline/sample";
import type { Sampled, Timeline } from "../../view/timeline/timeline";
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
  /** Where each goal's picture lies, in CSS pixels from the canvas's top left corner, in the level's order. */
  goals: readonly CssRect[];
  /** The hand's timeline showing a move, or null for no hand. */
  hand: Timeline | null;
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

/** Shows a sprite's image where its track is sampled at the frame's moment, in its own colors. */
export function placeSprite(
  image: GameObjects.Image,
  sampled: Readonly<Sampled>,
  context: Readonly<PaintContext>,
): void {
  const { metrics } = context;
  const scale = shownScale(context);
  if (image.depth !== sampled.raise) image.setDepth(sampled.raise);
  image
    .setPosition(
      acrossOf(metrics, sampled.x + sampled.leanX),
      downOf(metrics, sampled.y + sampled.leanY),
    )
    .setScale(scale * sampled.scaleX, scale * sampled.scaleY)
    .setRotation(sampled.rotation)
    .setAlpha(opacityOf(sampled.fade))
    .setVisible(true);
}
