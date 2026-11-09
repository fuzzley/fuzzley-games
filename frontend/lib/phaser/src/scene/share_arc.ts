import type { GameObjects } from "phaser";

/** Where a share's arc starts: the circle's top, at twelve o'clock. */
const TOP = -Math.PI / 2;

/**
 * Strokes a share of a circle, clockwise from its top, in the line the
 * `Graphics` holds: a ring that empties or fills as the share does, from
 * none at 0 to the whole circle at 1.
 */
export function strokeShareArc(
  graphics: GameObjects.Graphics,
  x: number,
  y: number,
  radius: number,
  share: number,
): void {
  graphics
    .beginPath()
    .arc(x, y, radius, TOP, TOP + 2 * Math.PI * share)
    .strokePath();
}
