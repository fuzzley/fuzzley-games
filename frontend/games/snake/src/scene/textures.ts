import { bakeTexture } from "@fz/phaser/scene";
import type { Scene } from "phaser";
import type { SnakePalette } from "../view/palette";

/** The apple's texture key. */
export const APPLE_TEXTURE = "snake-apple";

/** The crumbs' texture key. */
export const CRUMB_TEXTURE = "snake-crumb";

/**
 * Bakes the apple at a square's size in device pixels, so it is never
 * stretched: a round fruit in the apple's color, and a leaf.
 */
export function bakeApple(
  scene: Scene,
  square: number,
  palette: SnakePalette,
): void {
  bakeTexture(scene, APPLE_TEXTURE, square, square, (graphics) => {
    graphics.fillStyle(palette.apple);
    graphics.fillCircle(square * 0.5, square * 0.56, square * 0.36);
    graphics.fillStyle(palette.leaf);
    graphics.fillEllipse(
      square * 0.64,
      square * 0.18,
      square * 0.3,
      square * 0.16,
    );
  });
}

/** Returns a crumb's size, in device pixels, for a square's. */
export function crumbSize(square: number): number {
  return Math.max(2, Math.round(square * 0.16));
}

/** Bakes a crumb of apple, a dot in its color, for a square's size. */
export function bakeCrumb(
  scene: Scene,
  square: number,
  palette: SnakePalette,
): void {
  const size = crumbSize(square);
  bakeTexture(scene, CRUMB_TEXTURE, size, size, (graphics) => {
    graphics.fillStyle(palette.apple);
    graphics.fillCircle(size / 2, size / 2, size / 2);
  });
}
