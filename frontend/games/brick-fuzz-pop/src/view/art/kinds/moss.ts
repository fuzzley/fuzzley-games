// A moss brick, which grows a hit back after each round it survives: an
// earthy tile under a scalloped cap of moss with a two-leaved sprout cut out
// of it, and a die's pips below for the hits it has left, `moss()` in
// `docs/brick-fuzz-pop/art/make-art.mjs`. Its tile is the plain brick's in
// amber, the moss's body, and its cap and its pips are frames over it.

import { mixColors } from "@fz/phaser/color";
import {
  type Area,
  type ArtScale,
  type DrawCommand,
  ORIGIN,
  arcPoints,
  circle,
  ellipsePoints,
  placed,
  polygon,
  stroke,
  widthOf,
  within,
} from "@fz/phaser/shapes";
import { TINT, inkAt } from "../../colors/inks";
import type { WallPalette } from "../../colors/palette";
import type { KindArt } from "../art";
import { FRAMES, type FrameName, THICK_HITS } from "../frames";
import { cellFrame, diePips, itemAt, turned } from "../symbols";
import { tileBody, tileFrame, tileRadius } from "./brick";

/** The tint of the tile under a moss brick's cap, which is the moss's body in every palette. */
export const MOSS_TINT = TINT.amber;

/** How far down its cell the middles of its cap's scallops lie, the cap's foot, as a share of the cell. */
const CAP_FOOT = 0.27;

/** How many scallops its cap's foot has, from the tile's left edge to its right. */
const SCALLOPS = 6;

/** A scallop's radius, as a share of its cell. */
const SCALLOP_RADIUS = 0.092;

/** How far under each scallop its shadow lies, as a share of its cell. */
const SHADOW_DROP = 0.034;

/** How much black a scallop's shadow takes over the moss's green. */
const SHADOW_DARK = 0.38;

/** Its sprout's stem, from its foot in the cap up to its leaves, as shares of its cell, its top as much lower than the design's as its leaves. */
const STEM = [
  [0.5, 0.3],
  [0.5, 0.179],
] as const;

/** How wide its sprout's stem is, in field units. */
const STEM_WIDTH = 0.034;

/** Its sprout's two leaves, each an ellipse about its middle, as shares of its cell, turned from lying flat: a little lower than the design's, so each keeps a device pixel under the tile's top at every scale. */
const LEAVES = [
  { middle: [0.405, 0.141], degrees: 32 },
  { middle: [0.595, 0.141], degrees: -32 },
] as const;

/** How far a leaf reaches along itself and across, either side of its middle, as shares of its cell. */
const LEAF = { along: 0.082, across: 0.044 } as const;

/** Where a die's middle pip sits in its cell, below the cap, and how far apart its pips are, as shares of the cell: a little higher and tighter than the design's, so each pip keeps a device pixel off the tile's lip and the shadows at every scale. */
const DIE = { across: 0.5, down: 0.637, step: 0.14, radius: 0.056 } as const;

/** A moss brick's layers, by its hits left from 1: its tile, its cap, and its pips from 2. Made once, so finding a brick's makes nothing. */
const MOSS_LAYERS: readonly (readonly FrameName[])[] = [
  [tileFrame(MOSS_TINT), FRAMES.mossCap],
  ...THICK_HITS.map((hits) => [
    tileFrame(MOSS_TINT),
    FRAMES.mossCap,
    FRAMES.moss(hits),
  ]),
];

/**
 * Returns a moss brick's cap drawn over its tile in its cell: the moss over
 * the tile's top, round its corners, to a foot of scallops, each with a
 * shadow under it, in its face's green; and its sprout, a stem and two
 * leaves, cut out of it in its glyph's color.
 */
function capCommands(
  cell: Area,
  palette: WallPalette,
  scale: ArtScale,
): readonly DrawCommand[] {
  const { face, glyph } = palette.kinds.moss;
  const shadow = mixColors(
    0x000000,
    inkAt(palette.tints, TINT.green),
    SHADOW_DARK,
  );
  const body = tileBody(cell);
  const corner = tileRadius(cell);
  const foot = cell.y + CAP_FOOT * cell.height;
  const radius = SCALLOP_RADIUS * cell.width;
  // The scallops run from the tile's left edge to its right, flush with
  // both, whatever the tile's gap rounds to.
  const scallops = Array.from({ length: SCALLOPS }, (_, at) => ({
    x: body.x + radius + ((body.width - 2 * radius) * at) / (SCALLOPS - 1),
    y: foot,
  }));
  const left = { x: body.x + corner, y: body.y + corner };
  const right = { x: body.x + body.width - corner, y: body.y + corner };
  const cap = [
    { x: body.x, y: foot },
    ...arcPoints(left, corner, Math.PI, 1.5 * Math.PI),
    ...arcPoints(right, corner, 1.5 * Math.PI, 2 * Math.PI),
    { x: body.x + body.width, y: foot },
  ];
  return [
    ...scallops.map((middle) =>
      circle({ x: middle.x, y: middle.y + SHADOW_DROP * cell.height }, radius, {
        color: shadow,
      }),
    ),
    polygon(cap, { color: face }),
    ...scallops.map((middle) => circle(middle, radius, { color: face })),
    ...stroke(within(cell, STEM), {
      color: glyph,
      width: widthOf(STEM_WIDTH, scale),
    }),
    ...LEAVES.map(({ middle: [across, down], degrees }) =>
      polygon(
        placed(
          ellipsePoints(
            ORIGIN,
            LEAF.along * cell.width,
            LEAF.across * cell.width,
          ).map((point) => turned(point, degrees)),
          1,
          { x: cell.x + across * cell.width, y: cell.y + down * cell.height },
        ),
        { color: glyph },
      ),
    ),
  ];
}

/** Returns a moss brick's die of pips for its hits left, below its cap, cut out in a color. */
function pipsCommands(
  cell: Area,
  hits: number,
  color: number,
): readonly DrawCommand[] {
  return diePips(
    hits,
    {
      x: cell.x + DIE.across * cell.width,
      y: cell.y + DIE.down * cell.height,
    },
    DIE.step * cell.width,
    DIE.radius * cell.width,
    { color },
  );
}

/**
 * How a moss brick is drawn: the amber tile, its cap, and its pips while
 * it has two hits left or more, as a tough brick's die shows them, so a
 * hit grown back reads at every scale. It brings its cap's frame and its
 * pips' to the atlas; the tile is the plain brick's.
 */
export const MOSS_ART: KindArt = {
  layersOf: ({ hits }) => itemAt(MOSS_LAYERS, hits - 1),
  colorOf: (_, palette) => palette.kinds.moss.body,
  frames: (palette, scale) => [
    cellFrame(FRAMES.mossCap, scale, (cell) =>
      capCommands(cell, palette, scale),
    ),
    ...THICK_HITS.map((hits) =>
      cellFrame(FRAMES.moss(hits), scale, (cell) =>
        pipsCommands(cell, hits, palette.kinds.moss.glyph),
      ),
    ),
  ],
};
