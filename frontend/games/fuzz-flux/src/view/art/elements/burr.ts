// A burr: a ring of thorns round the fuzzball it sticks to, behind it, its
// points long and short in turn, its thorns drawn between two darker edges,
// as the design draws it; the fuzzball drawn smaller inside it, so its fur
// stands off the ring. And a tuft of the burr, which flies as the burr is
// brushed off.

import {
  type ArtFrame,
  type ArtScale,
  type Point,
  centered,
  stroke,
} from "@fz/phaser/shapes";
import type { BoardPalette } from "../../colors/palette";
import { BODY, inPixels, polar } from "../design_square";
import { tuftOf } from "../fluff";
import { FRAMES } from "../frame_names";

/** How large a burred fuzzball is drawn, as a share of a plain one, so its fur stands off its ring. */
export const BURRED_SCALE = 0.82;

/** How many points the ring of thorns has, long and short in turn, the first straight out to the right. */
const POINTS = 22;

/**
 * Says how the ring of thorns is drawn, in a body's radii: how far out its
 * long points and its short ones reach, and how wide its edges are drawn,
 * and its thorns over them.
 */
const RING_LOOK = {
  long: 1.74,
  short: 1.42,
  edges: 0.27,
  thorns: 0.13,
} as const;

/** The ring's points, round its middle, the first again at the end to close it. */
const RING: readonly Point[] = Array.from({ length: POINTS + 1 }, (_, i) =>
  polar(
    (i / POINTS) * 2 * Math.PI,
    BODY * (i % 2 === 0 ? RING_LOOK.long : RING_LOOK.short),
  ),
);

/** Returns a burr's ring of thorns and its tuft, in a palette at a scale, each about its square's middle. */
export function burrFrames(
  palette: BoardPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  return [
    centered(
      FRAMES.burr,
      inPixels(
        [
          ...stroke(RING, {
            color: palette.burrEdge,
            width: BODY * RING_LOOK.edges,
          }),
          ...stroke(RING, {
            color: palette.burr,
            width: BODY * RING_LOOK.thorns,
          }),
        ],
        scale,
      ),
    ),
    centered(FRAMES.burrTuft, inPixels(tuftOf(palette.burr), scale)),
  ];
}
