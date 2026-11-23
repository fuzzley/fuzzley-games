// A brick, and the tile most kinds of brick are drawn on: Brick Fuzz Pop's
// chunky tile with its corners cut at 45°, `cutTile()` and `brick()` in
// `docs/rickashay/art/make-art.mjs`, the slab `@fz/phaser/bricks` draws in
// `CUT_TILE`'s shares. Where a tile's corner is cut, a fuzzball turns, as
// the design's "The flight" has it, so the cut is the brick's own edge and
// not a softened one.

import { inkAt } from "@fz/brick-wall/view/inks";
import { type SlabShares, TILE_SLAB, slabCommands } from "@fz/phaser/bricks";
import type { Area, DrawCommand } from "@fz/phaser/shapes";
import type { KindArt } from "../art";
import { cellFrame } from "../cells";
import { FRAMES, type FrameName, INKS } from "../frames";
import { itemAt } from "../items";

/**
 * The tile's shares of its cell: Brick Fuzz Pop's square tile, its gap,
 * its strip, its lip and their shades, with each corner of its body cut
 * across at 45°, 0.11 of the cell along each side, and not round, as the
 * art's cut tile is.
 */
export const CUT_TILE = {
  ...TILE_SLAB,
  corner: 0,
  cut: 0.11,
} as const satisfies SlabShares;

/** A brick's layers, the plain tile in its tint, by tint, made once, so finding a brick's makes nothing. */
const TILE_LAYERS: readonly (readonly FrameName[])[] = INKS.map((ink) => [
  FRAMES.tile(ink),
]);

/**
 * Returns the tile in its cell, in an ink: a darker lip along its foot, its
 * body, and a lighter strip along its top and down the cuts across its top
 * corners, three flat shapes, each with its corners cut across at 45°, the
 * lip's and the strip's straight edges on whole device pixels.
 */
export function tileCommands(cell: Area, ink: number): readonly DrawCommand[] {
  return slabCommands(cell, ink, CUT_TILE);
}

/**
 * How a brick is drawn: the plain tile in its row's ink. It brings the
 * tile in each ink to the atlas, which every kind that stands on a tile in
 * its row's ink shows under its marks.
 */
export const PLAIN_ART = {
  layersOf: ({ tint }) => itemAt(TILE_LAYERS, tint),
  frames: (palette, scale) =>
    INKS.map((ink) =>
      cellFrame(FRAMES.tile(ink), scale, (cell) =>
        tileCommands(cell, inkAt(palette.tints, ink)),
      ),
    ),
} as const satisfies KindArt;
