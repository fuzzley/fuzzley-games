import type { Scene } from "phaser";
import { type WashStop, wash } from "../shapes";
import { paintTexture } from "./paint_canvas";

/** The color a soft disc is painted in, for a scene to tint. */
const WHITE = 0xffffff;

/**
 * How a soft disc fades from its middle out to its edge: strong at its
 * middle and falling away fast, so a disc scaled well past what it lies
 * under reads as light round it, not as a disc.
 */
const SOFT_DISC_STOPS: readonly WashStop[] = [
  { at: 0, color: WHITE, alpha: 0.9 },
  { at: 0.3, color: WHITE, alpha: 0.42 },
  { at: 0.62, color: WHITE, alpha: 0.13 },
  { at: 1, color: WHITE, alpha: 0 },
];

/**
 * Paints a soft disc into the canvas texture of a key, a size in pixels
 * across: white, fading from its middle to nothing at its edge, for a scene
 * to tint, scale and fade as a halo under plain alpha; and paints it again
 * whenever a lost WebGL context is restored, as `paintTexture()` does.
 *
 * It is painted once, through the canvas's own radial gradient, as a
 * `Graphics` draws none: a halo is an image of it, scaled, never a
 * gradient drawn each frame. Its size is a whole number of pixels, kept for
 * the game; painted again at another, it is resized in place, so the images
 * showing it set their frame again (`retakeFrames()`), as after a bake.
 */
export function softDisc(scene: Scene, key: string, size: number): void {
  const radius = size / 2;
  paintTexture(scene, key, size, size, [
    wash(
      { x: radius, y: radius, radiusX: radius, radiusY: radius, turn: 0 },
      { stops: SOFT_DISC_STOPS },
    ),
  ]);
}
