// A cage on a fuzzball, drawn over its body and its eyes: 4 bars down it
// in the bars' ink, their ends under a frame of steel round the square;
// and a bar of a cage opened, flying as a hard bit, in the frame's steel,
// which shows on the squares and the page it flies over as the bars' ink
// would not.

import {
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  centered,
  outlineRoundRect,
  rect,
} from "@fz/phaser/shapes";
import type { BoardPalette } from "../../colors/palette";
import { inPixels } from "../design_square";
import { FRAMES } from "../frame_names";

/** Where each bar runs down the cage, across from its middle, in the design's units. */
const BARS = [-24, -8, 8, 24] as const;

/** How wide a bar is, in the design's units. */
const BAR_WIDTH = 6.5;

/** How far a bar runs up and down from the cage's middle, its ends under the frame, in the design's units. */
const BAR_REACH = 40;

/** How far the middle of the frame's line lies out from the cage's middle, the radius of its corners and the width of its line, in the design's units. */
const FRAME = { reach: 41, corner: 13, width: 9 } as const;

/** How wide and how long a bar flying is, in the design's units, as the sketch throws them. */
const BIT = { width: 7, length: 72 } as const;

/** Returns a cage's bars and its frame over them, on the design's square about its middle. */
function cageOf({ bars, frame }: BoardPalette["cage"]): readonly DrawCommand[] {
  return [
    ...BARS.map((x) =>
      rect(
        {
          x: x - BAR_WIDTH / 2,
          y: -BAR_REACH,
          width: BAR_WIDTH,
          height: 2 * BAR_REACH,
        },
        { color: bars },
      ),
    ),
    outlineRoundRect(
      {
        x: -FRAME.reach,
        y: -FRAME.reach,
        width: 2 * FRAME.reach,
        height: 2 * FRAME.reach,
      },
      FRAME.corner,
      { color: frame, width: FRAME.width },
    ),
  ];
}

/** Returns a cage, and a bar of one opened, in a palette at a scale, each drawn about its square's middle. */
export function cageFrames(
  palette: BoardPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  return [
    centered(FRAMES.cage, inPixels(cageOf(palette.cage), scale)),
    centered(
      FRAMES.cageBar,
      inPixels(
        [
          rect(
            {
              x: -BIT.width / 2,
              y: -BIT.length / 2,
              width: BIT.width,
              height: BIT.length,
            },
            { color: palette.cage.frame },
          ),
        ],
        scale,
      ),
    ),
  ];
}
