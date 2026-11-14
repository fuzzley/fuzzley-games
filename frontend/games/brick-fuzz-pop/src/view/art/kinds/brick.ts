// A brick, and the chunky tile most kinds of brick are drawn on: `chunky()`
// and `brick()` in `docs/archive/brick-fuzz-pop/art/make-art.mjs`, the slab
// `@fz/phaser/bricks` draws in a square tile's shares (`TILE_SLAB`).

import {
  TILE_SLAB,
  slabBody,
  slabCommands,
  slabRadius,
} from "@fz/phaser/bricks";
import type { Area, DrawCommand } from "@fz/phaser/shapes";
import { inkAt } from "../../colors/inks";
import type { KindArt } from "../art";
import { FRAMES, type FrameName, INKS } from "../frames";
import { itemAt } from "../../items";
import { cellFrame } from "../symbols";

/** The plain tile's frames, by tint. */
const TILE_FRAMES: readonly FrameName[] = INKS.map((ink) => FRAMES.tile(ink));

/** A plain brick's layers, by tint, made once so finding a brick's makes nothing. */
const TILE_LAYERS: readonly (readonly FrameName[])[] = TILE_FRAMES.map(
  (frame) => [frame],
);

/**
 * Returns the name of the plain tile's frame in a tint.
 *
 * @throws {RangeError} for a tint no tile has.
 */
export function tileFrame(tint: number): FrameName {
  return itemAt(TILE_FRAMES, tint);
}

/**
 * Returns a tile's body in its cell: a whole number of device pixels in from
 * it on each side, one at least, but a pixel wide at least too, so a cell of
 * a pixel or two, as a canvas has before it is laid out, keeps one.
 */
export function tileBody(cell: Area): Area {
  return slabBody(cell, TILE_SLAB);
}

/** Returns how round a tile's corners are in its cell, in device pixels, which a frame laid over the tile follows. */
export function tileRadius(cell: Area): number {
  return slabRadius(cell, TILE_SLAB);
}

/**
 * Returns the chunky tile most kinds of brick are drawn on, in an ink: a
 * darker lip along its bottom, its body, and a lighter strip along its top,
 * three flat shapes, the lip's and the strip's straight edges on whole
 * device pixels.
 */
export function tileCommands(cell: Area, ink: number): readonly DrawCommand[] {
  return slabCommands(cell, ink, TILE_SLAB);
}

/** How a brick is drawn: the plain tile in its row's tint, which brings the tiles to the atlas for every kind that stands on one. */
export const PLAIN_ART: KindArt = {
  layersOf: ({ tint }) => itemAt(TILE_LAYERS, tint),
  frames: (palette, scale) =>
    INKS.map((ink) =>
      cellFrame(FRAMES.tile(ink), scale, (cell) =>
        tileCommands(cell, inkAt(palette.tints, ink)),
      ),
    ),
};
