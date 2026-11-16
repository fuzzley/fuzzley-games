// The fuzzball's fur combed toward standing on end, as a charge or a streak
// lifts it, and the sparks about it once it stands, after `fuzzball()` in
// `docs/archive/brick-fuzz-pop/art/make-art.mjs`: flat, combed straight half
// way, on end, and on end with sparks, and swept by a push on it; and
// static's sparks, as `@fz/style/fuzzball` lays them about any fur and the
// Asteroid Breaker uplift's art kit draws them, in
// `docs/archive/asteroid-breaker-uplift/art/lib/fuzzball.mjs`.

import {
  FUZZBALL_STRANDS,
  SPARK_LOOK,
  type SparkMark,
  type Strand,
  sweptFur,
} from "@fz/style/fuzzball";
import {
  type DrawCommand,
  type LineStyle,
  ORIGIN,
  type Point,
  placed,
  polygon,
  stroke,
  turned,
} from "../shapes";
import type { Worn } from "./fuzzball";

/** Says what static's sparks are drawn in: their bright cores, the halos beneath them, in the fuzzball's ink, and a CSS pixel's device pixels. */
export interface SparkStyle {
  readonly core: number;
  readonly halo: number;
  /** How many device pixels a CSS pixel is, since a tick's core is never narrower than `SPARK_LOOK.tickCoreLeast` of them. */
  readonly pixelRatio: number;
}

/** Describes static's sparks as commands, in two parts, since a game shows their halos at part strength as one. */
export interface StaticSparks {
  /**
   * Their halos, opaque, which a game bakes in a frame of their own and
   * shows at `SPARK_LOOK.haloAlpha` with `setAlpha()`, beneath the cores:
   * drawn at part alpha one by one, their lines' dots and pieces would
   * show stronger where they overlap.
   */
  readonly halos: readonly DrawCommand[];
  /** Their cores, opaque, over the halos. */
  readonly cores: readonly DrawCommand[];
}

/** How much longer a strand grows combed all the way than not at all, as a share of its length. */
const FULL_GROWTH = 0.3;

/**
 * The share of the way by which the fur has combed straight, so it is
 * straight from half way, as the art's half-combed look is.
 */
const STRAIGHT_BY = 0.5;

/** A spark's zigzag from where it starts, lying to the right, on the fuzzball's grid. */
const ZIGZAG: readonly Point[] = [
  { x: 0, y: -0.4 },
  { x: 1.7, y: -1.5 },
  { x: 1.5, y: 1.1 },
  { x: 3.6, y: 0 },
];

/**
 * The sparks about fur on end: which way each lies from the body's middle,
 * in degrees clockwise from its right, and how far from it it starts, on
 * the fuzzball's grid, every other one a little further out.
 */
const SPARKS = [
  { turn: -58, from: 16.4 },
  { turn: 8, from: 17 },
  { turn: 62, from: 16.4 },
  { turn: 148, from: 17 },
  { turn: 212, from: 16.4 },
] as const;

/** Each spark's zigzag about the body's middle, on the fuzzball's grid, made once. */
const ZIGZAGS: readonly (readonly Point[])[] = SPARKS.map(({ turn, from }) =>
  ZIGZAG.map(({ x, y }) => turned({ x: from + x, y }, turn)),
);

/**
 * Returns a strand combed a share of the way to standing on end: turned
 * from its own way toward straight out from the body's middle through its
 * root, grown longer, and bent less. Its root stays where it grew.
 */
function combed({ from, control, to }: Strand, share: number): Strand {
  const chord = { x: to.x - from.x, y: to.y - from.y };
  const length = Math.hypot(chord.x, chord.y);
  const root = Math.hypot(from.x, from.y);
  const way = {
    x: (chord.x / length) * (1 - share) + (from.x / root) * share,
    y: (chord.y / length) * (1 - share) + (from.y / root) * share,
  };
  const reach = (length * (1 + FULL_GROWTH * share)) / Math.hypot(way.x, way.y);
  const grown = { x: way.x * reach, y: way.y * reach };
  // The control as shares of the chord, along it and aside it, kept as the
  // chord turns and grows, with the bend it gives eased away.
  const bent = { x: control.x - from.x, y: control.y - from.y };
  const along = (bent.x * chord.x + bent.y * chord.y) / length ** 2;
  const aside = (chord.x * bent.y - chord.y * bent.x) / length ** 2;
  const bend = aside * Math.max(0, 1 - share / STRAIGHT_BY);
  return {
    from,
    control: {
      x: from.x + grown.x * along - grown.y * bend,
      y: from.y + grown.y * along + grown.x * bend,
    },
    to: { x: from.x + grown.x, y: from.y + grown.y },
  };
}

/**
 * Returns the fuzzball's fur combed a share of the way to standing on end,
 * each strand from where it grew: at 0 as it grew, give or take a rounding;
 * at 0.5 straight, leaning half way out from the body's middle and 15%
 * longer; and at 1 straight out from the middle and 30% longer. A lean, a
 * push on it on the grid, then sweeps it as `@fz/style`'s `sweptFur()`
 * does, the other way.
 *
 * Each strand's way is its own and straight out, each a unit long, blended
 * by the share; its growth is the share's, and its bend eases away by half
 * the way.
 *
 * @throws {RangeError} for a share outside 0 to 1.
 */
export function combedStrands(
  share: number,
  lean: Point = ORIGIN,
): readonly Strand[] {
  if (!(share >= 0 && share <= 1)) {
    throw new RangeError(
      `Fur is combed from 0 to 1 of the way, not ${String(share)}`,
    );
  }
  return sweptFur(
    FUZZBALL_STRANDS.map((strand) => combed(strand, share)),
    lean,
  );
}

/**
 * Returns the brick games' sparks about fur on end, five zigzags round
 * the fuzzball's body about its middle, `by` device pixels to a unit of its
 * grid, each a line through its points in a style, round at its ends and
 * corners.
 *
 * A fuzzball wears them outlined as one with it as `wornSparks()` gives
 * them.
 */
export function sparkCommands(
  by: number,
  style: LineStyle,
): readonly DrawCommand[] {
  return ZIGZAGS.flatMap((points) => stroke(placed(points, by), style));
}

/**
 * Returns the sparks about fur on end as a fuzzball wears them, `by` device
 * pixels to a unit of its grid, for `fuzzballWearing()` to outline as one
 * with it: the sparks in a style over its body and fur, and again beneath
 * them in the outline's color, the outline's width wider either side, as
 * the fuzzball's own outline widens its body and fur.
 */
export function wornSparks(
  by: number,
  style: LineStyle,
  outline: LineStyle,
): Worn {
  return {
    outlines: sparkCommands(by, {
      color: outline.color,
      width: style.width + 2 * outline.width,
    }),
    over: sparkCommands(by, style),
  };
}

/**
 * Returns static's sparks about the fuzzball's body's middle, `by` device
 * pixels to a unit of its grid, as `SPARK_LOOK` says and the kit draws
 * them, where `sparkCommands()` draws the brick games' zigzags: each
 * tick's halo a line round at its ends and corners, each star's the star
 * and a line round its edge, round at its corners; each tick's core a line
 * no narrower than `SPARK_LOOK.tickCoreLeast` CSS pixels, and each star's
 * the star.
 */
export function staticSparkCommands(
  by: number,
  sparks: readonly SparkMark[],
  style: SparkStyle,
): StaticSparks {
  const drawn = sparks.map((mark) => sparkOf(mark, by, style));
  return {
    halos: drawn.flatMap(({ halos }) => halos),
    cores: drawn.flatMap(({ cores }) => cores),
  };
}

/** Returns a mark of static's halo and core, `by` device pixels to a unit of the grid. */
function sparkOf(
  { kind, points }: SparkMark,
  by: number,
  { core, halo, pixelRatio }: SparkStyle,
): StaticSparks {
  const at = placed(points, by);
  switch (kind) {
    case "tick":
      return {
        halos: stroke(at, { color: halo, width: SPARK_LOOK.tickHalo * by }),
        cores: stroke(at, {
          color: core,
          width: Math.max(
            SPARK_LOOK.tickCoreLeast * pixelRatio,
            SPARK_LOOK.tickCore * by,
          ),
        }),
      };
    case "star":
      return {
        halos: [
          polygon(at, { color: halo }),
          ...stroke([...at, ...at.slice(0, 1)], {
            color: halo,
            width: SPARK_LOOK.starHalo * by,
          }),
        ],
        cores: [polygon(at, { color: core })],
      };
  }
}
