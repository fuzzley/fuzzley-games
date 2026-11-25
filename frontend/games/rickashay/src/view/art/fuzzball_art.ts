// The fuzzball's art: `@fz/phaser`'s fuzzball, its fur lifted by its
// flight's rally, after `fuzzballAt()` in `docs/rickashay/art/make-art.mjs`.
// Waiting, and to a rally of 9, its fur is as it grew; from 10 it is combed
// half way to standing on end (`combedStrands()`); from 25 it stands on end;
// and from 45 sparks stand about it too (`wornSparks()`). The hot shot is
// the fuzzball red-hot, its fur on end, under a crown of flame
// (`wornFlames()`), Brick Fuzz Pop's `hotShot()` there. Its eyes are a
// frame of their own, cut out in the mark, which `eyesAt()` shifts the way
// it flies, and half shut once it heads home, bored or brought home by a
// guard (`eyesFrameOf()`). Each fuzzball is outlined in the mark, as one
// with its sparks or flames (`fuzzballWearing()`).

import type { Place } from "@fz/brick-wall/view/field_metrics";
import {
  type EyesStyle,
  FUZZBALL_GRID,
  FUZZBALL_LOOK,
  FUZZBALL_STRANDS,
  type Strand,
  combedStrands,
  eyesCommands,
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
import type { WallPalette } from "../colors/palette";
import type { BallView } from "../run_state";
import { FRAMES, FURS, type FrameName, type Fur } from "./frames";

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

/** How wide a unit of the fuzzball's grid is drawn, in field units. */
const GRID_UNIT = FUZZBALL_SIDE / FUZZBALL_GRID;

/** How wide a spark's line is, in field units: a unit of the fuzzball's grid. */
const SPARK_WIDTH = GRID_UNIT;

/** How far the eyes shift the way the fuzzball flies, across the field and up it, in field units: as far as `FUZZBALL_LOOK` shifts the mark's. */
const LOOK = {
  across: FUZZBALL_LOOK.across * GRID_UNIT,
  up: FUZZBALL_LOOK.down * GRID_UNIT,
} as const;

/** The fur standing on end, made once: the last two lifts' and the hot shot's. */
const ON_END = combedStrands(1);

/**
 * The fur at each lift, made once: as it grew, combed half way to standing
 * on end, and on end, at the last lift with sparks about it.
 */
const FUR = {
  0: FUZZBALL_STRANDS,
  1: combedStrands(0.5),
  2: ON_END,
  3: ON_END,
} as const satisfies Readonly<Record<Fur, readonly Strand[]>>;

/** The lift at which sparks stand about the fur. */
const SPARKING: Fur = 3;

/** The name of the fuzzball's frame at each lift of its fur, made once, so finding one makes nothing. */
const FUZZBALL_NAMES = {
  0: FRAMES.fuzzball(0),
  1: FRAMES.fuzzball(1),
  2: FRAMES.fuzzball(2),
  3: FRAMES.fuzzball(3),
} as const satisfies Readonly<Record<Fur, FrameName>>;

/** Returns the frame a fuzzball's body is drawn in: red-hot under its crown of flame for a hot shot, else at its fur's lift. */
export function bodyFrameOf({
  hot,
  fur,
}: Pick<BallView, "hot" | "fur">): FrameName {
  return hot ? FRAMES.hotShot : FUZZBALL_NAMES[fur];
}

/**
 * Returns the frame a fuzzball's eyes are drawn in: half shut once it has
 * yawned, bored, or a guard has brought it home, as it drops to the floor,
 * else open.
 */
export function eyesFrameOf({ home }: Pick<BallView, "home">): FrameName {
  return home ? FRAMES.yawn : FRAMES.eyes;
}

/**
 * Writes where a fuzzball's eyes are drawn, in field units, into a place
 * and returns it: at its body's middle, which their frame is drawn about,
 * shifted down as it drops home, whatever speed it is left with; up while
 * it waits, toward its shot, with no speed; and else the way it flies, as
 * `FUZZBALL_LOOK` shifts the mark's, as far at any speed. So Brick Fuzz
 * Pop's look.
 */
export function eyesAt(
  { x, y, dx, dy, home }: Pick<BallView, "x" | "y" | "dx" | "dy" | "home">,
  into: Place,
): Place {
  const speed = Math.hypot(dx, dy);
  if (home || speed === 0) {
    into.x = x;
    into.y = y + (home ? -LOOK.up : LOOK.up);
  } else {
    into.x = x + (dx / speed) * LOOK.across;
    into.y = y + (dy / speed) * LOOK.up;
  }
  return into;
}

/** Returns how many device pixels a unit of the fuzzball's grid is drawn at. */
export function fuzzballGrid(scale: ArtScale): number {
  return (scale.unit * FUZZBALL_SIDE) / FUZZBALL_GRID;
}

/**
 * Returns the fuzzball's frames in a palette at a scale, each about its
 * body's middle: one at each lift of its fur, the hot shot, and its eyes,
 * open, looking straight out, and half shut as it yawns. Each fuzzball is
 * outlined in the mark as one with its sparks or flames, and the eyes are
 * cut out in the mark, their lids a CSS pixel wide at least.
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
  const flames = wornFlames(by, palette.spark, outline);
  const eyes: EyesStyle = {
    color: palette.mark,
    leastLine: Math.ceil(scale.pixelRatio),
  };
  return [
    ...FURS.map((fur) =>
      centered(
        FUZZBALL_NAMES[fur],
        fuzzballWearing(
          by,
          { color: palette.fuzzball, outline, fur: FUR[fur] },
          fur === SPARKING ? sparks : {},
        ),
      ),
    ),
    centered(
      FRAMES.hotShot,
      fuzzballWearing(
        by,
        { color: palette.hotShot, outline, fur: ON_END },
        flames,
      ),
    ),
    centered(FRAMES.eyes, eyesCommands(by, eyes)),
    centered(FRAMES.yawn, eyesCommands(by, eyes, { face: "sleepy" })),
  ];
}
