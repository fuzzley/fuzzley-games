// A square's well, the rounded square a fuzzball sits in, a shade off the
// page and inset from its square, so the page shows between one well and
// the next. A board's gap is a square with no well: the page shows through
// it, edged by its neighbors' wells and their round corners, as the design
// draws it, so no frame draws a gap or its edge.

import {
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  centered,
  roundRect,
} from "@fz/phaser/shapes";
import type { BoardPalette } from "../colors/palette";
import { SQUARE, inPixels } from "./design_square";
import { FRAMES } from "./frame_names";

/** How far a well is inset from its square's edge all round, in the design's units. */
const INSET = 3;

/** The radius of a well's corners, in the design's units. */
const CORNER = 17;

/** Returns a square's well in a color, on the design's square about its middle. */
export function wellOf(color: number): DrawCommand {
  const half = SQUARE / 2 - INSET;
  return roundRect(
    { x: -half, y: -half, width: 2 * half, height: 2 * half },
    CORNER,
    { color },
  );
}

/** Returns a square's well in a palette at a scale, drawn about its square's middle. */
export function wellFrame(palette: BoardPalette, scale: ArtScale): ArtFrame {
  return centered(FRAMES.square, inPixels([wellOf(palette.square)], scale));
}
