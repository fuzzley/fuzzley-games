// The frames Rickashay's flourishes are drawn with, as the design's
// "Flourishes" gives them: a broken brick's shards, the ring a fuzzball
// leaves as its fur lifts, the streak its dash home leaves, a spark off a
// plated face or a shut lock, a portal's swirl, and a floor bounce's puff.

import { shardFrame } from "@fz/brick-wall/view/art";
import {
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  centered,
  circle,
  polygon,
  ring,
  stroke,
  widthOf,
} from "@fz/phaser/shapes";
import type { WallPalette } from "../colors/palette";
import { STREAK } from "../effects/timing";

/** The names of the flourishes' frames. */
export const EFFECT_FRAMES = {
  shard: "shard",
  ring: "rally-ring",
  streak: "streak",
  hotStreak: "hot-streak",
  spark: "spark",
  swirl: "swirl",
  puff: "puff",
} as const satisfies Readonly<Record<string, string>>;

/** Says how the ring a fuzzball leaves is drawn, in field units: its line's middle at its widest, and its line, a CSS pixel at least. */
export const RALLY_RING = {
  radius: 1,
  width: 0.08,
} as const satisfies Readonly<Record<string, number>>;

/** How wide the streak is at its head, at the fuzzball, in field units: its length is `STREAK`. */
export const STREAK_HEAD = 0.36;

/** Says how a spark is drawn, in field units: how far its rays reach from its middle, and their line, a CSS pixel at least. */
export const SPARK = {
  reach: 0.3,
  width: 0.06,
} as const satisfies Readonly<Record<string, number>>;

/** The ways a spark's rays point, in radians, clockwise from the right. */
const SPARK_RAYS: readonly number[] = [
  0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75,
].map((turn) => turn * Math.PI);

/** Says how a portal's swirl is drawn at its widest, in field units: its line's middle, and its line, a CSS pixel at least. */
export const SWIRL = {
  radius: 0.45,
  width: 0.08,
} as const satisfies Readonly<Record<string, number>>;

/** How wide a floor bounce's puff is at its widest, in field units. */
export const PUFF = 0.7;

/**
 * Returns the flourishes' frames, drawn in a palette at a scale: a shard in
 * white, for a tint to color as its brick; the ring in the fuzzball's
 * color; the streak in the streaks' plain color and their hot one; a spark
 * in the sparks'; a swirl in the fuzzball's; and a puff in the field's
 * text, which the scene shows faint.
 */
export function effectFrames(
  palette: WallPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  return [
    shardFrame(EFFECT_FRAMES.shard, scale),
    ringFrame(EFFECT_FRAMES.ring, RALLY_RING, palette.fuzzball, scale),
    streakFrame(EFFECT_FRAMES.streak, palette.streak.plain, scale),
    streakFrame(EFFECT_FRAMES.hotStreak, palette.streak.hot, scale),
    centered(
      EFFECT_FRAMES.spark,
      SPARK_RAYS.flatMap((angle): readonly DrawCommand[] =>
        stroke(
          [
            {
              x: 0.4 * SPARK.reach * scale.unit * Math.cos(angle),
              y: 0.4 * SPARK.reach * scale.unit * Math.sin(angle),
            },
            {
              x: SPARK.reach * scale.unit * Math.cos(angle),
              y: SPARK.reach * scale.unit * Math.sin(angle),
            },
          ],
          { color: palette.spark, width: widthOf(SPARK.width, scale) },
        ),
      ),
    ),
    ringFrame(EFFECT_FRAMES.swirl, SWIRL, palette.fuzzball, scale),
    centered(EFFECT_FRAMES.puff, [
      circle({ x: 0, y: 0 }, (PUFF * scale.unit) / 2, { color: palette.text }),
    ]),
  ];
}

/** Returns a ring about its frame's middle, its line's middle at a radius, in a color. */
function ringFrame(
  name: string,
  { radius, width }: { readonly radius: number; readonly width: number },
  color: number,
  scale: ArtScale,
): ArtFrame {
  return centered(name, [
    ring({ x: 0, y: 0 }, radius * scale.unit, {
      color,
      width: widthOf(width, scale),
    }),
  ]);
}

/**
 * Returns the streak about its middle, along the frame's width: from a
 * point at its tail to its head, as wide as {@link STREAK_HEAD}, the way
 * the fuzzball flies, in a color.
 */
function streakFrame(name: string, color: number, scale: ArtScale): ArtFrame {
  const half = (STREAK * scale.unit) / 2;
  const head = widthOf(STREAK_HEAD, scale) / 2;
  return centered(name, [
    polygon(
      [
        { x: -half, y: 0 },
        { x: half, y: -head },
        { x: half, y: head },
      ],
      { color },
    ),
  ]);
}
