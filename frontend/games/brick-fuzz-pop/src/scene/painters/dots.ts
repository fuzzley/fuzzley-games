import type { GameObjects } from "phaser";

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
