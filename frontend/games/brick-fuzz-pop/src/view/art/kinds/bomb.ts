// A bomb: a round bomb cut out of a tile in the danger color, a short fuse, a
// spark at its end, and a dot toward each of the bricks around it that the
// spark leaves room for, `bomb()` in
// `docs/archive/brick-fuzz-pop/art/make-art.mjs`.

import {
  type Area,
  type ArtScale,
  type DrawCommand,
  arcPoints,
  circle,
  polygon,
  star,
  stroke,
  widthOf,
  within,
} from "@fz/phaser/shapes";
import type { WallPalette } from "../../colors/palette";
import type { KindArt } from "../art";
import { FRAMES } from "../frames";
import { EIGHTH, cellFrame, detailed, pointAt } from "../symbols";
import { tileCommands } from "./brick";

/**
 * Where its dots sit, toward each brick around it but the one its spark
 * covers, the top right, as shares of its cell: a third of the cell from its
 * face's middle, a little less up and down.
 */
const DOTS: readonly (readonly [number, number])[] = (
  [
    [-1, -1],
    [0, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [0, 1],
    [1, 1],
  ] as const
).map(([across, down]) => [0.5 + across * 0.33, 0.48 + down * 0.31] as const);

/** A dot's radius, as a share of its cell. */
const DOT_RADIUS = 0.027;

/** The bomb's round body, its middle and its radius, as shares of its cell. */
const BODY = { across: 0.46, down: 0.56, radius: 0.195 } as const;

/**
 * The bomb's neck, a block 0.14 of its cell long and 0.1 thick turned an
 * eighth of a turn back from lying along its row, toward the fuse, about a
 * middle on the bomb's rim: its corners, as shares of its cell.
 */
const NECK: readonly (readonly [number, number])[] = (
  [
    [-0.07, -0.05],
    [0.07, -0.05],
    [0.07, 0.05],
    [-0.07, 0.05],
  ] as const
).map(
  ([across, down]) =>
    [
      0.612 + (across + down) * EIGHTH,
      0.408 + (down - across) * EIGHTH,
    ] as const,
);

/** Its fuse, from the neck to the spark, as shares of its cell. */
const FUSE = [
  [0.63, 0.39],
  [0.675, 0.32],
  [0.72, 0.275],
] as const;

/** How wide its fuse is, in field units. */
const FUSE_WIDTH = 0.036;

/** The shine on the bomb, an arc of its face's color about its middle: its radius, as a share of its cell, and where it runs, in degrees clockwise from the right. */
const SHINE = { radius: 0.125, from: 196, to: 248 } as const;

/** How wide its shine is, in field units. */
const SHINE_WIDTH = 0.034;

/**
 * The spark at the fuse's end, a star of four points about a middle, as
 * shares of its cell: cut out of the tile, round a spark in the sparks'
 * color.
 */
const SPARK = {
  across: 0.765,
  down: 0.235,
  cut: { outer: 0.15, inner: 0.064 },
  lit: { outer: 0.105, inner: 0.036 },
} as const;

/** Returns an angle given in degrees in radians. */
function radians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Returns a bomb drawn in its cell: its tile in its body's color; its dots,
 * where a scale is detailed, its body, its neck and its fuse cut out in its
 * glyph's; the shine on it in its face's; and the spark at its fuse's end.
 */
function bombCommands(
  cell: Area,
  palette: WallPalette,
  scale: ArtScale,
): readonly DrawCommand[] {
  const { body, face, glyph } = palette.kinds.bomb;
  const cut = { color: glyph };
  const middle = pointAt(cell, BODY.across, BODY.down);
  const spark = pointAt(cell, SPARK.across, SPARK.down);
  return [
    ...tileCommands(cell, body),
    ...(detailed(scale)
      ? within(cell, DOTS).map((dot) =>
          circle(dot, DOT_RADIUS * cell.width, cut),
        )
      : []),
    circle(middle, BODY.radius * cell.width, cut),
    polygon(within(cell, NECK), cut),
    ...stroke(within(cell, FUSE), {
      color: glyph,
      width: widthOf(FUSE_WIDTH, scale),
    }),
    ...stroke(
      arcPoints(
        middle,
        SHINE.radius * cell.width,
        radians(SHINE.from),
        radians(SHINE.to),
      ),
      { color: face, width: widthOf(SHINE_WIDTH, scale) },
    ),
    polygon(
      star(
        spark,
        SPARK.cut.outer * cell.width,
        SPARK.cut.inner * cell.width,
        4,
      ),
      cut,
    ),
    polygon(
      star(
        spark,
        SPARK.lit.outer * cell.width,
        SPARK.lit.inner * cell.width,
        4,
      ),
      { color: palette.spark },
    ),
  ];
}

/** A bomb's layers, made once. */
const BOMB_LAYERS = [FRAMES.bomb] as const;

/** How a bomb is drawn: one frame, as it breaks at its first hit. */
export const BOMB_ART: KindArt = {
  layersOf: () => BOMB_LAYERS,
  frames: (palette, scale) => [
    cellFrame(FRAMES.bomb, scale, (cell) => bombCommands(cell, palette, scale)),
  ],
};
