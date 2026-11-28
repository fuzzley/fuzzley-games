// The one atlas every image on the board shows a frame of: the art's
// frames, and the pictures the shell shows beside the board, baked at
// whole device pixels for the board's square, as `bakedScale()` caps it,
// in the board's palette, and again once either changes. `bakeAtlas()`
// draws it again after a lost context.

import type { AtlasBaking } from "@fz/phaser/scene";
import { bakedScale } from "../view/art/frames";
import type { BoardPalette } from "../view/colors/palette";
import { atlasWithPictures } from "./pictures";

/** The atlas's texture key, which every image on the board shows a frame of. */
export const ATLAS = "fuzz-flux-atlas";

/** How the board's atlas is baked: under {@link ATLAS}, the art's frames and the pictures drawn from them, at the scale `bakedScale()` gives a board's square. */
export const BOARD_ATLAS: AtlasBaking<BoardPalette> = {
  key: ATLAS,
  framesOf: atlasWithPictures,
  scaleOf: bakedScale,
};
