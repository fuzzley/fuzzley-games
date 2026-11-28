// Every frame the atlas holds, and the scale it is baked at.

import type { ArtFrame, ArtScale } from "@fz/phaser/shapes";
import type { BoardPalette } from "../colors/palette";
import { bodyFrames } from "./bodies";
import { brickFrames } from "./elements/brick";
import { burrFrames } from "./elements/burr";
import { cageFrames } from "./elements/cage";
import { dustFrames } from "./elements/dust";
import { sleepyheadFrame } from "./elements/sleepyhead";
import { windFrames } from "./elements/wind";
import { eyesFrames } from "./eyes";
import { fluffFrames } from "./fluff";
import { frizzballFrames } from "./frizzball";
import { markFrames } from "./marks";
import { wellFrame } from "./well";

/** The largest square the atlas is baked at, in device pixels: 96 CSS pixels at a pixel ratio of 3. */
const MOST_BAKED_SQUARE = 288;

/**
 * Returns the scale the atlas is baked at for a board's square: its own, up
 * to {@link MOST_BAKED_SQUARE}, at its pixel ratio.
 *
 * A board whose squares are larger shows its frames scaled up, so the
 * atlas keeps to its budget, and to a side every device takes, however
 * large a screen lays the board out.
 */
export function bakedScale(square: ArtScale): ArtScale {
  return {
    unit: Math.min(square.unit, MOST_BAKED_SQUARE),
    pixelRatio: square.pixelRatio,
  };
}

/** Returns every frame the atlas holds, in a palette at a scale. */
export function atlasFrames(
  palette: BoardPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  return [
    ...bodyFrames(palette, scale),
    ...frizzballFrames(palette, scale),
    sleepyheadFrame(palette, scale),
    ...eyesFrames(scale),
    wellFrame(palette, scale),
    ...dustFrames(palette, scale),
    ...brickFrames(palette, scale),
    ...cageFrames(palette, scale),
    ...burrFrames(palette, scale),
    ...windFrames(palette, scale),
    ...fluffFrames(palette, scale),
    ...markFrames(palette, scale),
  ];
}
