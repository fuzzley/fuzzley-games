import type { Scene } from "phaser";
import type { Insets } from "../insets";
import type { Viewport } from "../layout";
import { pixelRatioOf } from "./scene_lifetime";

/**
 * Returns the canvas a scene lays itself out on, as it now is: the scale's
 * size, in device pixels, the ratio it renders at, and the chrome as given.
 *
 * The chrome is the object given, not a copy, so a scene can tell by
 * identity whether the chrome it was laid out under is still the one over
 * it.
 */
export function viewportOf(scene: Scene, insets: Insets): Viewport {
  return {
    width: scene.scale.width,
    height: scene.scale.height,
    pixelRatio: pixelRatioOf(scene),
    insets,
  };
}

/**
 * Returns whether a scene's canvas is no longer the one it was last laid
 * out on, a new size or pixel ratio, or whether it was never laid out; the
 * chrome over it, and anything else it lays out by, are the scene's to
 * check.
 */
export function canvasChanged(scene: Scene, last: Viewport | null): boolean {
  return (
    last?.width !== scene.scale.width ||
    last.height !== scene.scale.height ||
    last.pixelRatio !== pixelRatioOf(scene)
  );
}
