// The fuzzball's art: `@fz/phaser`'s fuzzball, its fur lifted by its
// flight's rally, after `fuzzballAt()` in `docs/rickashay/art/make-art.mjs`.
// Waiting, and to a rally of 9, its fur is as it grew; from 10 it is combed
// half way to standing on end (`combedStrands()`); from 25 it stands on end;
// and from 45 sparks stand about it too (`wornSparks()`). Each is outlined
// in the mark, as one with its sparks (`fuzzballWearing()`).

import {
  FUZZBALL_GRID,
  FUZZBALL_STRANDS,
  type Strand,
  combedStrands,
  fuzzballWearing,
  wornSparks,
} from "@fz/phaser/fuzzball";
import {
  type ArtFrame,
  type ArtScale,
  type LineStyle,
  centered,
  widthOf,
} from "@fz/phaser/shapes";
import { RALLY_MARKS } from "../../rules/tuning";
import type { WallPalette } from "../colors/palette";
import { FRAMES, FURS, type Fur } from "./frames";

/**
 * How wide the fuzzball's grid is drawn, in field units, as the art draws
 * it, a fortieth of a cell to a unit of the grid: its body 0.26 units
 * round, about a fuzzball's `RADIUS`, and its fur past that.
 */
const FUZZBALL_SIDE = 0.8;

/**
 * How wide the fuzzball's outline is, in field units. It is the mark, the
 * field's color, so it shows only where the fuzzball crosses something.
 */
const OUTLINE_WIDTH = 0.03;

/** How wide a spark's line is, in field units: a unit of the fuzzball's grid. */
const SPARK_WIDTH = FUZZBALL_SIDE / FUZZBALL_GRID;

/**
 * The fur at each lift, made once: as it grew, combed half way to standing
 * on end, and on end, at the last lift with sparks about it.
 */
const FUR: Readonly<Record<Fur, readonly Strand[]>> = {
  0: FUZZBALL_STRANDS,
  1: combedStrands(0.5),
  2: combedStrands(1),
  3: combedStrands(1),
};

/** The lift at which sparks stand about the fur. */
const SPARKING: Fur = 3;

/**
 * Returns how far the fuzzball's fur has lifted at a flight's rally: not at
 * all to a rally of 9, then a lift more at each of `RALLY_MARKS`, 10, 25
 * and 45, as each floor bounce of the ladder's first three is earned.
 */
export function furAt(rally: number): Fur {
  const [lifts, standsOn, sparks] = RALLY_MARKS;
  if (rally >= sparks) return 3;
  if (rally >= standsOn) return 2;
  return rally >= lifts ? 1 : 0;
}

/** Returns how many device pixels a unit of the fuzzball's grid is drawn at. */
export function fuzzballGrid(scale: ArtScale): number {
  return (scale.unit * FUZZBALL_SIDE) / FUZZBALL_GRID;
}

/**
 * Returns the fuzzball's frames in a palette at a scale, each about its
 * body's middle: one at each lift of its fur, outlined in the mark as one
 * with its sparks.
 */
export function fuzzballFrames(
  palette: WallPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  const by = fuzzballGrid(scale);
  const outline: LineStyle = {
    color: palette.mark,
    width: widthOf(OUTLINE_WIDTH, scale),
  };
  const sparks = wornSparks(
    by,
    { color: palette.spark, width: widthOf(SPARK_WIDTH, scale) },
    outline,
  );
  return FURS.map((fur) =>
    centered(
      FRAMES.fuzzball(fur),
      fuzzballWearing(
        by,
        { color: palette.fuzzball, outline, fur: FUR[fur] },
        fur === SPARKING ? sparks : {},
      ),
    ),
  );
}
