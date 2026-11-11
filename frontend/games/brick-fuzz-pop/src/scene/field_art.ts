// The frames the scene adds to the atlas beside the art's: the dots the
// field is drawn with and the warning frame, baked so each is round and
// sharp, where a live Graphics would draw it unsmoothed and anew every
// frame.

import {
  type ArtFrame,
  type ArtScale,
  circle,
  inset,
  outlineRoundRect,
  widthOf,
} from "@fz/phaser/shapes";
import { cellOf } from "../view/art/symbols";
import type { WallPalette } from "../view/colors/palette";

/**
 * The names of the scene's own frames: a dot at each corner the field's
 * cells share, a dot of the jump line's count, one for each brick left
 * under it, and the warning frame round a brick one step from losing the
 * level.
 */
export const FIELD_FRAMES = {
  gridDot: "grid-dot",
  countDot: "count-dot",
  warning: "warning-frame",
} as const;

/** How wide a dot of the grid is, in field units, as the art draws it: 2.2 of a cell of 40. */
export const GRID_DOT = 0.055;

/** How wide a dot of the jump line's count is, in field units. */
export const COUNT_DOT = 0.14;

/**
 * Says how the warning frame is drawn, in field units: how round its outer
 * corners are, as a tile's would be at its cell's edge; its band in the
 * danger color, in from the cell's edge; and the seam in the field's color
 * inside the band, which keeps it apart from a tile of a color near the
 * danger color.
 */
const WARNING_FRAME = { corner: 0.18, band: 0.08, seam: 0.03 } as const;

/**
 * Returns the scene's own frames, drawn in a palette at a scale: the grid's
 * dot in the field's line, the count's in the jump line's color, each a CSS
 * pixel wide at least, and the warning frame, a cell's.
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
    warningFrame(palette, scale),
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

/**
 * Returns the warning frame: a cell, a band of the danger line's color in
 * along its edge, over a tile's gap and its rim, and a seam of the field's
 * color inside the band, each a CSS pixel wide at least.
 */
function warningFrame(palette: WallPalette, scale: ArtScale): ArtFrame {
  const cell = cellOf(scale);
  const band = widthOf(WARNING_FRAME.band, scale);
  const seam = widthOf(WARNING_FRAME.seam, scale);
  const corner = WARNING_FRAME.corner * cell.width;
  return {
    name: FIELD_FRAMES.warning,
    width: cell.width,
    height: cell.height,
    commands: [
      outlineRoundRect(inset(cell, band / 2), corner - band / 2, {
        color: palette.dangerLine,
        width: band,
      }),
      outlineRoundRect(inset(cell, band + seam / 2), corner - band - seam / 2, {
        color: palette.field,
        width: seam,
      }),
    ],
  };
}
