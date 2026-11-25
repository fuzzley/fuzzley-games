// The fuzzballs' art: `@fz/phaser`'s fuzzball, its fur combed by its
// charge (`combedStrands()`), after `fuzzball()`, `flame()` and `hotShot()` in
// `docs/archive/brick-fuzz-pop/art/make-art.mjs`. The player's at each charge,
// sparking at a full one (`wornSparks()`); the hot shot under a crown of
// flame (`wornFlames()`), each outlined as one with what it wears
// (`fuzzballWearing()`); a friend in each ink; and the eyes they all wear, a
// frame of their own that the scene moves the way a fuzzball looks. A
// triple shot's mates are the player's fuzzball again, in its ink and at its
// charge, so the triple shot is three of the player's frames and has none of
// its own.

import { itemAt } from "@fz/core/records";
import {
  FUZZBALL_GRID,
  type Strand,
  combedStrands,
  eyesCommands,
  fuzzballCommands,
  fuzzballWearing,
  wornFlames,
  wornSparks,
} from "@fz/phaser/fuzzball";
import {
  type ArtFrame,
  type ArtScale,
  type LineStyle,
  centered,
  widthOf,
} from "@fz/phaser/shapes";
import type { Charge } from "../../rules/shot";
import { MOST_CHARGE } from "../../rules/tuning";
import type { WallPalette } from "../colors/palette";
import { CHARGES, FRAMES, INKS } from "./frames";

/**
 * How wide the fuzzball's grid is drawn, in field units, as the art draws
 * it, a fortieth of a cell to a unit of the grid: its body 0.26 units
 * round, about a fuzzball's `RADIUS`, and its fur past that.
 */
const FUZZBALL_SIDE = 0.8;

/**
 * How wide every fuzzball's outline is, in field units. It is the mark,
 * the field's color, so it shows only where a fuzzball crosses something.
 */
const OUTLINE_WIDTH = 0.03;

/** How wide a spark's line is, in field units: a unit of the fuzzball's grid. */
const SPARK_WIDTH = FUZZBALL_SIDE / FUZZBALL_GRID;

/** The fur at each charge, made once, combed a fifth of the way for each: the fuzzball's own at 0, standing on end at 5. */
const FUR: readonly (readonly Strand[])[] = CHARGES.map((charge) =>
  combedStrands(charge / MOST_CHARGE),
);

/**
 * Returns how many device pixels a unit of the fuzzball's grid is drawn
 * at, so a scene moves a fuzzball's eyes by `FUZZBALL_LOOK` times this the
 * way it looks.
 */
export function fuzzballGrid(scale: ArtScale): number {
  return (scale.unit * FUZZBALL_SIDE) / FUZZBALL_GRID;
}

/**
 * Returns the fuzzball's fur at a charge: the fuzzball's own at 0, combed
 * straighter and longer with each charge, and on end at 5.
 *
 * @throws {RangeError} for a charge past the most.
 */
export function furOf(charge: Charge): readonly Strand[] {
  return itemAt(FUR, charge);
}

/**
 * Returns the fuzzballs' frames in a palette at a scale, each about its
 * body's middle: the player's at each charge, the hot shot, a friend in
 * each ink, and the eyes. Every fuzzball is outlined in the mark, as one
 * with its sparks or flames.
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
  const spark: LineStyle = {
    color: palette.spark,
    width: widthOf(SPARK_WIDTH, scale),
  };
  const sparks = wornSparks(by, spark, outline);
  const flames = wornFlames(by, palette.spark, outline);
  return [
    ...CHARGES.map((charge) =>
      centered(
        FRAMES.fuzzball(charge),
        fuzzballWearing(
          by,
          { color: palette.fuzzball, outline, fur: furOf(charge) },
          charge === MOST_CHARGE ? sparks : {},
        ),
      ),
    ),
    centered(
      FRAMES.hotShot,
      fuzzballWearing(
        by,
        { color: palette.hotShot, outline, fur: furOf(MOST_CHARGE) },
        flames,
      ),
    ),
    ...INKS.map((ink) =>
      centered(
        FRAMES.friend(ink),
        fuzzballCommands(by, {
          color: itemAt(palette.friends, ink),
          outline,
          fur: furOf(0),
        }),
      ),
    ),
    centered(FRAMES.eyes, eyesCommands(by, { color: palette.mark })),
  ];
}
