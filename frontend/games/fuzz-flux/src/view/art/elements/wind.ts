// A line of wind, which a gust sends across the board: a thin stroke round
// at its ends, in the muted text, as the sketch draws it, as long as a line
// grows, for the scene to draw shorter as it sets out, which flattens its
// round ends by less than a pixel.

import {
  type ArtFrame,
  type ArtScale,
  centered,
  stroke,
} from "@fz/phaser/shapes";
import type { BoardPalette } from "../../colors/palette";
import { LONGEST_GUST_LINE } from "../../effects/gust_line";
import { SQUARE, inPixels } from "../design_square";
import { FRAMES } from "../frame_names";

/** How wide a line of wind is drawn, in the design's units: 2 CSS pixels on the smallest square. */
const LINE_WIDTH = 5;

/** Returns a line of wind at its longest, pointing right about its middle, in a palette at a scale. */
export function windFrames(
  palette: BoardPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  const half = (LONGEST_GUST_LINE * SQUARE) / 2;
  return [
    centered(
      FRAMES.gustLine,
      inPixels(
        stroke(
          [
            { x: -half, y: 0 },
            { x: half, y: 0 },
          ],
          { color: palette.gust, width: LINE_WIDTH },
        ),
        scale,
      ),
    ),
  ];
}
