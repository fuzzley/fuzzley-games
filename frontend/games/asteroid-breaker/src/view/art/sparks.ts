// The sparks a broken rock sheds, as the art kit draws its motes
// (`docs/archive/asteroid-breaker-uplift/art/lib/things.mjs`' `moteSvg()` and
// `moteDrawnSvg()`): each a four-point spark in the accent's energy, its
// bright middle in its body, a soft halo of the accent about it, which the
// scene shows; one the ship draws in streaks toward the pod, a tail behind
// it, and one in its last second blinks.

import { keysOf, recordOf } from "@fz/core/records";
import {
  type ArtFrame,
  type ArtScale,
  centered,
  placed,
  polygon,
} from "@fz/phaser/shapes";
import { type Spark, drawReach, sparkBlinks } from "../../rules/sparks/sparks";
import {
  type Place,
  type Torus,
  across,
  distanceSquared,
} from "../../rules/torus";
import { SPARK_PULL_SPEED } from "../../rules/tuning";
import type { BeltPalette } from "../colors/palette";
import { blinkShown } from "../effects/flourish";
import type { FieldView } from "../field/frame";
import { sparkPoints } from "./breaks";
import { type Halo, type WrittenHalo, energyOf } from "./energy";

/** Describes how a spark of a size is cut: how far its points reach, in field units, and how far its waist reaches, as a share of that. */
export interface SparkCut {
  readonly reach: number;
  readonly pinch: number;
}

/**
 * The sizes a spark is drawn at, the kit's motes' larger two
 * (`MOTE_SIZES`), each cut as the kit cuts it; its smallest, a diamond,
 * the game has no use for.
 */
export const SPARK_CUTS = {
  medium: { reach: 0.25, pinch: 0.34 },
  large: { reach: 0.35, pinch: 0.27 },
} as const satisfies Readonly<Record<string, SparkCut>>;

/** One of the sizes a spark is drawn at. */
export type SparkSize = keyof typeof SPARK_CUTS;

/** Every size a spark is drawn at, the smaller first. */
export const SPARK_SIZES: readonly SparkSize[] = keysOf(SPARK_CUTS);

/** Each size of spark's frame's name. */
export const SPARK_FRAMES: Readonly<Record<SparkSize, string>> = recordOf(
  SPARK_SIZES,
  (size) => `spark-${size}`,
);

/** The frame of a spark's tail as the ship draws it in: a unit long behind the spark, for the scene to stretch and turn. */
export const SPARK_TAIL_FRAME = "spark-tail";

/** How far a spark's points reach, in CSS pixels, before it has a bright middle, as the kit's. */
const MIDDLE_FROM_CSS_PX = 2;

/** How far a spark's bright middle reaches, as a share of its points. */
const MIDDLE_SHARE = 0.55;

/** A spark's halo, as the kit's mote's: how far it reaches, as a share of the spark's points, and how strongly it shows. */
export const SPARK_HALO = { share: 2.7, strength: 0.85 } as const;

/**
 * How wide a spark's tail is where it leaves the spark, each side of its
 * way, as a share of the medium spark's points, and its layers, back to
 * front: how far each reaches, as a share of the tail's length, and how
 * opaque it is, so it is strongest by the spark, near the kit's drawn
 * mote's 0.6, and fades to nothing behind it, as the kit's tail does.
 */
export const SPARK_TAIL = {
  half: 0.45,
  layers: [
    { share: 1, alpha: 0.3 },
    { share: 0.5, alpha: 0.4 },
  ],
} as const;

/**
 * How long a spark's tail is, in field units, as the ship draws it in: as
 * far as it is drawn in a tenth of a second, as the kit's tail reaches back
 * along a drawn mote's way.
 */
export const SPARK_TAIL_LENGTH = SPARK_PULL_SPEED * 0.1;

/** How far a spark's turn is from upright either way at most, in radians, as the kit's motes lie. */
const MOST_TURN = 0.3;

/** A share of a turn each spark's slot turns on from the last, so neighbours never lie alike. */
const GOLDEN_SHARE = (Math.sqrt(5) - 1) / 2;

/**
 * Describes a spark's tail as the ship draws it in, written again into a
 * record made once: the way the spark streaks, in radians, toward the pod,
 * its tail trailing behind it, and how far the tail's frame is stretched
 * along that way and across it.
 */
export interface SparkTail {
  angle: number;
  along: number;
  across: number;
}

/**
 * Returns the size of spark a slot of the field's draws: every third the
 * larger, as the kit's motes scatter, so the one a slot holds keeps its
 * size.
 */
export function sparkSizeOf(slot: number): SparkSize {
  return slot % 3 === 2 ? "large" : "medium";
}

/** Returns how far the spark a slot of the field holds is turned, in radians, a little either way, each slot its own. */
export function sparkTurnOf(slot: number): number {
  return (((slot * GOLDEN_SHARE) % 1) * 2 - 1) * MOST_TURN;
}

/**
 * Writes the halo of a spark of a size, round about its middle, into a
 * record and returns it: as far past its points as the kit's reaches.
 */
export function sparkHalo(size: SparkSize, into: WrittenHalo): Halo {
  const reach = SPARK_CUTS[size].reach * SPARK_HALO.share;
  into.along = reach;
  into.across = reach;
  into.ahead = 0;
  into.turn = 0;
  into.strength = SPARK_HALO.strength;
  return into;
}

/** Returns whether a spark shows at a time, in seconds: always, but for the off half of each blink in its last second. */
export function isSparkShown(
  spark: Readonly<Spark>,
  steps: number,
  seconds: number,
): boolean {
  return !sparkBlinks(spark, steps) || blinkShown(seconds);
}

/**
 * Returns whether the ship draws a spark in, so it streaks toward the pod
 * with a tail behind it: as the rules draw one, from as far as the field's
 * draw reaches, by its speed or a Magnet's, across the wrap.
 */
export function isSparkDrawn(
  field: Pick<FieldView, "ship" | "torus" | "sparking" | "setup" | "pullReach">,
  spark: Readonly<Spark>,
): boolean {
  const { ship, torus } = field;
  if (!ship) return false;
  return (
    distanceSquared(torus, spark.x, spark.y, ship.x, ship.y) <=
    drawReach(field) ** 2
  );
}

/**
 * Writes the tail of a spark of a size where it is drawn, as the ship draws
 * it in toward where the pod is drawn, into a record and returns it: the
 * spark streaking toward the pod, the short way across the wrap, its tail
 * behind it as long as {@link SPARK_TAIL_LENGTH} and as wide as the spark,
 * the frame being the medium's width.
 */
export function sparkTail(
  size: SparkSize,
  at: Readonly<Place>,
  pod: Readonly<Place>,
  torus: Torus,
  into: SparkTail,
): SparkTail {
  into.angle = Math.atan2(
    across(at.y, pod.y, torus.height),
    across(at.x, pod.x, torus.width),
  );
  into.along = SPARK_TAIL_LENGTH;
  into.across = SPARK_CUTS[size].reach / SPARK_CUTS.medium.reach;
  return into;
}

/** Returns a spark of a size's frame: its points in the accent's body, and, where they reach 2 CSS pixels, its middle in its hot tone, as the kit's mote. */
function sparkArt(
  size: SparkSize,
  palette: BeltPalette,
  scale: ArtScale,
): ArtFrame {
  const { reach: cut, pinch } = SPARK_CUTS[size];
  const tones = energyOf(palette.accent, palette);
  const reach = cut * scale.unit;
  const middle =
    reach >= MIDDLE_FROM_CSS_PX * scale.pixelRatio
      ? [
          polygon(sparkPoints(reach * MIDDLE_SHARE, pinch, 0), {
            color: tones.hot,
          }),
        ]
      : [];
  return centered(SPARK_FRAMES[size], [
    polygon(sparkPoints(reach, pinch, 0), { color: tones.body }),
    ...middle,
  ]);
}

/**
 * Returns a spark's tail's frame, a unit long behind it along x from the
 * frame's middle, as wide where it leaves as the medium spark's, in the
 * accent's body in its layers; the scene stretches it as long as the tail
 * and as wide as its spark.
 */
function tailArt(palette: BeltPalette, scale: ArtScale): ArtFrame {
  const half = SPARK_TAIL.half * SPARK_CUTS.medium.reach;
  const { body } = energyOf(palette.accent, palette);
  return centered(
    SPARK_TAIL_FRAME,
    SPARK_TAIL.layers.map(({ share, alpha }) =>
      polygon(
        placed(
          [
            { x: 0, y: -half },
            { x: -share, y: 0 },
            { x: 0, y: half },
          ],
          scale.unit,
        ),
        { color: body, alpha },
      ),
    ),
  );
}

/** Returns the sparks' frames, in a palette at a scale: each size's, and the tail one streaks with as it is drawn in. */
export function sparkFrames(
  palette: BeltPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  return [
    ...SPARK_SIZES.map((size) => sparkArt(size, palette, scale)),
    tailArt(palette, scale),
  ];
}
