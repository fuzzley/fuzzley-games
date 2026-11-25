// A moss brick, which grows a hit back after each round it survives: an
// earthy tile under a scalloped cap of moss with a two-leaved sprout cut
// out of it, and a die's pips below for the hits it has left, `moss()` in
// `docs/rickashay/art/make-art.mjs`, drawn by `@fz/phaser/bricks`'
// `scallopedCap()` and `sproutMark()` as Brick Fuzz Pop's moss is. Its tile
// is the amber ink's, which a brick in an amber row shows too, and its cap
// and its pips are frames of their own over it.
//
// Its numbers, and the cap's white in `../../colors/palette.ts`, are Brick
// Fuzz Pop's moss's (`frontend/games/brick-fuzz-pop/src/view/art/kinds/
// moss.ts`), on Rickashay's cut tile, so a change to one is made to both.

import { cellFrame } from "@fz/brick-wall/view/art";
import { TINT, inkAt } from "@fz/brick-wall/view/inks";
import { itemAt } from "@fz/core/records";
import { scallopedCap, sproutMark } from "@fz/phaser/bricks";
import { mixColors } from "@fz/phaser/color";
import {
  type Area,
  type ArtScale,
  type DrawCommand,
  diePips,
} from "@fz/phaser/shapes";
import type { WallPalette } from "../../colors/palette";
import type { KindArt } from "../art";
import { FRAMES, type FrameName, MOSS_HITS } from "../frames";
import { CUT_TILE } from "./brick";

/**
 * Says how the cap's foot is scalloped, as shares of its cell, the art's:
 * how far down it the scallops' middles lie, how many there are from the
 * tile's left side to its right, how round each is, and how far under
 * each its shadow lies.
 */
const CAP = { foot: 0.27, scallops: 6, radius: 0.092, drop: 0.034 } as const;

/** How much black a scallop's shadow takes over the green tile's ink: the art's. */
const SHADOW_DARK = 0.38;

/**
 * Where a die's middle pip sits in its cell, below the cap, how far apart
 * its pips are and how round each is, as shares of the cell: a little
 * higher and tighter than the art's, as Brick Fuzz Pop's are, so each pip
 * keeps a device pixel off the tile's lip and the scallops' shadows at
 * every scale.
 */
const DIE = { across: 0.5, down: 0.637, step: 0.14, radius: 0.056 } as const;

/** A moss brick's layers, by its hits left from 1: the amber tile and its cap, and its pips from 2 hits left. Made once, so finding a brick's makes nothing. */
const MOSS_LAYERS: readonly (readonly FrameName[])[] = [
  [FRAMES.tile(TINT.amber), FRAMES.mossCap],
  ...MOSS_HITS.map((hits) => [
    FRAMES.tile(TINT.amber),
    FRAMES.mossCap,
    FRAMES.moss(hits),
  ]),
];

/**
 * Returns a moss brick's cap over its tile in its cell: the moss over the
 * tile's top, cut across its corners, to a foot of scallops, each over a
 * shadow of the green darkened, in the palette's cap; and its sprout, a
 * stem and two leaves, cut out of it in the marks' color.
 */
function capCommands(
  cell: Area,
  palette: WallPalette,
  scale: ArtScale,
): readonly DrawCommand[] {
  const shadow = mixColors(
    0x000000,
    inkAt(palette.tints, TINT.green),
    SHADOW_DARK,
  );
  return [
    ...scallopedCap(
      cell,
      CUT_TILE,
      cell.y + CAP.foot * cell.height,
      {
        count: CAP.scallops,
        radius: CAP.radius * cell.width,
        drop: CAP.drop * cell.height,
      },
      { cap: palette.mossCap, shadow },
    ),
    ...sproutMark(cell, palette.mark, scale.pixelRatio),
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
 * How a moss brick is drawn: the amber tile, whatever its row, its cap,
 * and its pips while it has two hits left or more, as a tough brick's die
 * shows them, so a hit grown back shows. It brings its cap's frame and its
 * pips' to the atlas, each drawn at every scale, since they are what tell
 * the kind and its hits.
 *
 * It finds no layers for no hits left, or for more than 3, throwing a
 * `RangeError`.
 */
export const MOSS_ART = {
  layersOf: ({ hits }) => itemAt(MOSS_LAYERS, hits - 1),
  frames: (palette, scale) => [
    cellFrame(FRAMES.mossCap, scale, (cell) =>
      capCommands(cell, palette, scale),
    ),
    ...MOSS_HITS.map((hits) =>
      cellFrame(FRAMES.moss(hits), scale, (cell) =>
        pipsCommands(cell, hits, palette.mark),
      ),
    ),
  ],
} as const satisfies KindArt;
