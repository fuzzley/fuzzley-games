// Dust on a square, one layer or two: a well of its own, paler than the
// square's, which it covers, and specks over it, more and larger on thick
// dust, which tell it from a clean square where its shade alone would not.

import { createRandom } from "@fz/core/random";
import {
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  centered,
  circle,
} from "@fz/phaser/shapes";
import type { BoardPalette } from "../../colors/palette";
import { inPixels } from "../design_square";
import { DUSTY, type Dusty, FRAMES } from "../frame_names";
import { wellOf } from "../well";

/** Says how a layer of dust is specked: how many specks, how much larger than the least a speck may be, in the design's units, and the seed they are scattered from, so they fall the same every time. */
interface Specks {
  readonly count: number;
  readonly larger: number;
  readonly seed: number;
}

/** How each count of layers of dust is specked. */
const SPECKS = {
  1: { count: 7, larger: 2, seed: 78 },
  2: { count: 13, larger: 3.2, seed: 79 },
} as const satisfies Readonly<Record<Dusty, Specks>>;

/** How far across the middle of a well its specks are scattered, in the design's units. */
const SCATTER = 74;

/** The radius of the least speck, in the design's units. */
const LEAST_SPECK = 2.2;

/** Returns dust's specks in a color, on the design's square about its middle. */
function specksOf(
  { count, larger, seed }: Specks,
  color: number,
): readonly DrawCommand[] {
  const random = createRandom(seed);
  return Array.from({ length: count }, () => {
    const x = (random() - 0.5) * SCATTER;
    const y = (random() - 0.5) * SCATTER;
    return circle({ x, y }, LEAST_SPECK + random() * larger, { color });
  });
}

/** Returns a square's dust at each count of layers, in a palette at a scale, each drawn about its square's middle over its well. */
export function dustFrames(
  palette: BoardPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  return DUSTY.map((layers) =>
    centered(
      FRAMES.dust(layers),
      inPixels(
        [
          wellOf(palette.dust[layers]),
          ...specksOf(SPECKS[layers], palette.specks),
        ],
        scale,
      ),
    ),
  );
}
