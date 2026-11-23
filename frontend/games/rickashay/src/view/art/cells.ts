// The cell a brick's frames are drawn in, each frame the whole of it, so
// the frames a brick shows stack, and whether a scale draws a brick's
// finest detail.

import { showsDetail } from "@fz/phaser/bricks";
import type { Area, ArtFrame, ArtScale, DrawCommand } from "@fz/phaser/shapes";
import type { FrameName } from "./frames";

/**
 * Returns a brick's cell at a scale, which each of its frames fills: a unit
 * square, in whole device pixels, one at least.
 */
export function cellOf(scale: ArtScale): Area {
  const side = Math.max(1, Math.round(scale.unit));
  return { x: 0, y: 0, width: side, height: side };
}

/** Returns a frame the size of a brick's cell at a scale, drawn in it. */
export function cellFrame(
  name: FrameName,
  scale: ArtScale,
  draw: (cell: Area) => readonly DrawCommand[],
): ArtFrame {
  const cell = cellOf(scale);
  return { name, width: cell.width, height: cell.height, commands: draw(cell) };
}

/**
 * Returns whether a scale draws a brick's finest detail, a tough brick's
 * cracks and steel's rivets: a unit 30 CSS pixels wide or more, by
 * `showsDetail()`'s rule, under which the design's small bricks drop it.
 */
export function detailed(scale: ArtScale): boolean {
  return showsDetail(scale, 1);
}
