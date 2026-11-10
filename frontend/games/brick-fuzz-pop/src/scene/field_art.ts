// The frames the scene adds to the atlas beside the art's: the dots the
// field is drawn with, baked so each is round and sharp, where a live
// Graphics would draw it unsmoothed and anew every frame.

import {
  type ArtFrame,
  type ArtScale,
  circle,
  widthOf,
} from "@fz/phaser/shapes";
import type { WallPalette } from "../view/colors/palette";

/**
 * The names of the scene's own frames: a dot at each corner the field's
 * cells share, and a dot of the jump line's count, one for each brick left
 * under it.
 */
export const FIELD_FRAMES = {
  gridDot: "grid-dot",
  countDot: "count-dot",
} as const;

/** How wide a dot of the grid is, in field units, as the art draws it: 2.2 of a cell of 40. */
export const GRID_DOT = 0.055;

/** How wide a dot of the jump line's count is, in field units. */
export const COUNT_DOT = 0.14;

/**
 * Returns the scene's own frames, drawn in a palette at a scale: the grid's
 * dot in the field's line and the count's in the jump line's color, each a
 * CSS pixel wide at least.
 */
export function fieldFrames(
  palette: WallPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  return [
    dotFrame(FIELD_FRAMES.gridDot, widthOf(GRID_DOT, scale), palette.line),
    dotFrame(
      FIELD_FRAMES.countDot,
      widthOf(COUNT_DOT, scale),
      palette.jumpLine,
    ),
  ];
}

/** Returns a frame of a dot that fills it, some device pixels wide, in a color. */
function dotFrame(name: string, side: number, color: number): ArtFrame {
  const half = side / 2;
  return {
    name,
    width: side,
    height: side,
    commands: [circle({ x: half, y: half }, half, { color })],
  };
}
