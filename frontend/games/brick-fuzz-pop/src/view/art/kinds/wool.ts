// A wool brick: a knitted patch, rows of stitches across a tile in pink, and
// a disc cut out of its top right corner with a lightning bolt on it, for
// the charge it gives, `wool()` in `docs/brick-fuzz-pop/art/make-art.mjs`.

import { mixColors } from "@fz/phaser/color";
import {
  type Area,
  type ArtScale,
  type DrawCommand,
  type Point,
  circle,
  placed,
  stroke,
  widthOf,
} from "@fz/phaser/shapes";
import type { WallPalette } from "../../colors/palette";
import type { KindArt } from "../art";
import { FRAMES } from "../frames";
import { boltMark, cellFrame, pointAt } from "../symbols";
import { tileCommands } from "./brick";

/** Where its rows of stitches lie, down its cell, and each stitch's middle along a row, across it, as shares of the cell. */
const STITCHES = {
  rows: [0.29, 0.485, 0.68],
  columns: [0.18, 0.34, 0.5, 0.66, 0.82],
} as const;

/** A stitch, a V about its middle, as shares of its cell: down from its left arm's tip to its foot, and up to its right's. */
const STITCH: readonly Point[] = [
  { x: -0.062, y: -0.065 },
  { x: 0, y: 0.06 },
  { x: 0.062, y: -0.065 },
];

/** How wide a stitch's yarn is, in field units. */
const YARN_WIDTH = 0.04;

/** How much white the yarn takes over the tile's ink. */
const YARN_LIGHT = 0.52;

/** The disc its bolt is cut out of, in its corner, and how far the bolt reaches up and down from its middle, as shares of its cell. */
const BADGE = { across: 0.79, down: 0.21, radius: 0.145, bolt: 0.1 } as const;

const WHITE = 0xffffff;

/**
 * Returns a wool brick drawn in its cell: its tile in its body's color, its
 * stitches in its yarn, lighter, then a disc in its glyph's color in its
 * corner, over the stitches there, with a bolt in the sparks' color on it.
 */
function woolCommands(
  cell: Area,
  palette: WallPalette,
  scale: ArtScale,
): readonly DrawCommand[] {
  const { body, glyph } = palette.kinds.wool;
  const yarn = {
    color: mixColors(WHITE, body, YARN_LIGHT),
    width: widthOf(YARN_WIDTH, scale),
  };
  const badge = pointAt(cell, BADGE.across, BADGE.down);
  return [
    ...tileCommands(cell, body),
    ...STITCHES.rows.flatMap((down) =>
      STITCHES.columns.flatMap((across) =>
        stroke(placed(STITCH, cell.width, pointAt(cell, across, down)), yarn),
      ),
    ),
    circle(badge, BADGE.radius * cell.width, { color: glyph }),
    boltMark(badge, BADGE.bolt * cell.width, { color: palette.spark }),
  ];
}

/** A wool brick's layers, made once. */
const WOOL_LAYERS = [FRAMES.wool] as const;

/** How a wool brick is drawn: one frame, as it breaks at its first hit. */
export const WOOL_ART: KindArt = {
  layersOf: () => WOOL_LAYERS,
  colorOf: (_, palette) => palette.kinds.wool.body,
  frames: (palette, scale) => [
    cellFrame(FRAMES.wool, scale, (cell) => woolCommands(cell, palette, scale)),
  ],
};
