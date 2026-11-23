// What a wall game's painters draw each frame from, and how one places a
// dot so it stays as sharp as it is baked.

import type { ArtScale } from "@fz/phaser/shapes";
import type { GameObjects } from "phaser";
import type { At } from "../rules/track";
import type { FieldMetrics, FieldShape } from "../view/field_metrics";
import type { WallPalette } from "../view/palette";
import type { BallPlace, PlaybackView } from "../view/playback";

/**
 * Says what a frame of a wall game's field is drawn from: the game's view of
 * the round at this moment, the field's shape and where it lies as it was
 * last laid out, the scale and the palette the atlas was last baked at and
 * in, the scene's time, and whether the player welcomes motion.
 *
 * A scene writes one over each frame, so drawing makes nothing. A game's
 * own context extends it over its own palette, `P`, with whatever else its
 * own painters draw from.
 */
export interface PaintContext<V, P extends WallPalette = WallPalette> {
  /** The round as the game's view draws it at this moment. */
  view: V;
  /** The field's shape it was laid out by: its depth, its band and its lintel. */
  shape: FieldShape;
  /** Where the field lies on the canvas. */
  metrics: FieldMetrics;
  /** The scale the atlas was baked at, which a larger unit shows scaled up. */
  baked: ArtScale;
  /** The palette the atlas was baked in. */
  palette: P;
  /** The scene's time, in milliseconds, which every flourish is timed by. */
  now: number;
  /** Whether the player welcomes motion. */
  motion: boolean;
}

/**
 * Says what of a game's view of the round the field's and the wall's
 * painters draw from, as a played-back round's view has it: the wall as it
 * looks at this moment, and how far through its step or jump it is.
 */
export type WallView<K extends string> = Pick<
  PlaybackView<K, At, BallPlace, unknown>,
  "wall" | "wallDrop"
>;

/** Draws a part of a wall game's field, in the layers it was given, each frame. */
export interface Painter<C> {
  /** Draws its part of the field as the frame has it. */
  draw(context: Readonly<C>): void;
}

/**
 * Shows a dot about a point, scaled, a whole number of device pixels wide
 * and high, its edges on whole pixels, which a dot baked whole needs to
 * stay sharp where the game doesn't round its images' places.
 */
export function placeDot(
  dot: GameObjects.Image,
  x: number,
  y: number,
  scale: number,
): GameObjects.Image {
  const side = Math.round(dot.width * scale);
  return dot
    .setDisplaySize(side, side)
    .setPosition(onWholePixels(x, side), onWholePixels(y, side));
}

/** Returns where the middle of something some whole device pixels wide stands about a point, so that its edges fall on whole pixels. */
function onWholePixels(middle: number, side: number): number {
  return Math.round(middle - side / 2) + side / 2;
}
