// The fuzzballs' art: `@fz/phaser`'s fuzzball, its fur combed by its
// charge (`combedStrands()`), after `fuzzball()`, `flame()` and `hotShot()` in
// `docs/archive/brick-fuzz-pop/art/make-art.mjs`. The player's at each charge,
// sparking at a full one (`wornSparks()`); the hot shot under a crown of
// flame, each outlined as one with what it wears (`fuzzballWearing()`); a
// friend in each ink; and the eyes they all wear, a frame of their own that
// the scene moves the way a fuzzball looks. A triple shot's mates
// are the player's fuzzball again, in its ink and at its charge, so the
// triple shot is three of the player's frames and has none of its own.

import {
  FUZZBALL_GRID,
  type Strand,
  type Worn,
  combedStrands,
  eyesCommands,
  fuzzballCommands,
  fuzzballWearing,
  wornSparks,
} from "@fz/phaser/fuzzball";
import {
  type ArtFrame,
  type ArtScale,
  type LineStyle,
  type Point,
  centered,
  placed,
  polygon,
  stroke,
  widthOf,
} from "@fz/phaser/shapes";
import type { Charge } from "../../rules/shot";
import { MOST_CHARGE } from "../../rules/tuning";
import type { WallPalette } from "../colors/palette";
import { CHARGES, FRAMES, INKS } from "./frames";
import { itemAt } from "../items";
import { turned } from "./symbols";

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

/** Describes a tongue of the hot shot's flame, on the fuzzball's grid. */
interface Flame {
  /** Which way it points from the body's middle, in degrees clockwise from its right. */
  readonly turn: number;
  /** How far its tip is from the body's middle. */
  readonly to: number;
  /** What its width is drawn to: 0.7 of it at its root, swelling to about five sixths of it, then narrowing to its tip. */
  readonly width: number;
  /** How far its tip leans aside, clockwise. */
  readonly lean: number;
}

/** The hot shot's crown of flame, from its left to its right. */
const FLAMES: readonly Flame[] = [
  { turn: -129, to: 20, width: 8.6, lean: 3 },
  { turn: -104, to: 24, width: 9.6, lean: 1.2 },
  { turn: -78, to: 21.6, width: 9, lean: -2.6 },
  { turn: -53, to: 19.2, width: 8.2, lean: -3 },
];

/** How far from the body's middle a tongue of flame rises, from behind the body, on the fuzzball's grid. */
const FLAME_FROM = 11.5;

/** How many steps each side of a tongue of flame takes from its root to its tip. */
const FLAME_STEPS = 8;

/** The fur at each charge, made once, combed a fifth of the way for each: the fuzzball's own at 0, standing on end at 5. */
const FUR: readonly (readonly Strand[])[] = CHARGES.map((charge) =>
  combedStrands(charge / MOST_CHARGE),
);

/**
 * Returns a tongue of flame as a polygon's points about the body's middle,
 * on the fuzzball's grid: it rises from behind the body, swells, then leans
 * as it narrows to its tip.
 */
function tongue({ turn, to, width, lean }: Flame): readonly Point[] {
  const left: Point[] = [];
  const right: Point[] = [];
  for (let step = 0; step <= FLAME_STEPS; step++) {
    const t = step / FLAME_STEPS;
    const along = FLAME_FROM + (to - FLAME_FROM) * t;
    const half =
      (width / 2) * (1 - t) ** 1.2 * (0.7 + 0.65 * Math.sin(Math.PI * t));
    left.push({ x: along, y: lean * t * t - half });
    right.push({ x: along, y: lean * t * t + half });
  }
  return [...left, ...right.reverse().slice(1)].map((point) =>
    turned(point, turn),
  );
}

/** The hot shot's tongues of flame, made once, on the fuzzball's grid. */
const TONGUES: readonly (readonly Point[])[] = FLAMES.map(tongue);

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
  const tongues = TONGUES.map((points) => placed(points, by));
  const sparks = wornSparks(by, spark, outline);
  // The hot shot's tongues of flame lie behind it, each tongue's outline a
  // closed line round it, the outline's width either side of its edge.
  const flames: Worn = {
    outlines: tongues.flatMap((points) =>
      stroke([...points, ...points.slice(0, 1)], {
        color: outline.color,
        width: 2 * outline.width,
      }),
    ),
    beneath: tongues.map((points) => polygon(points, { color: palette.spark })),
  };
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
