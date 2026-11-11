// A brick, and the chunky tile most kinds of brick are drawn on: `chunky()`
// and `brick()` in `docs/archive/brick-fuzz-pop/art/make-art.mjs`.

import { mixColors } from "@fz/phaser/color";
import {
  type Area,
  type DrawCommand,
  type Point,
  arcPoints,
  inset,
  polygon,
  roundRect,
} from "@fz/phaser/shapes";
import { inkAt } from "../../colors/inks";
import type { KindArt } from "../art";
import { FRAMES, type FrameName, INKS } from "../frames";
import { itemAt } from "../../items";
import { cellFrame } from "../symbols";

/** How far in from its cell a tile's body lies on each side, as a share of the cell. */
const GAP = 0.04;

/** How round a tile's corners are, as a share of its cell. */
const CORNER = 0.14;

/** How tall the lighter strip along a tile's top is, as a share of its cell. */
const STRIP = 0.05;

/** How tall the darker lip along a tile's bottom is, as a share of its cell. */
const LIP = 0.07;

/** How much white a tile's strip takes over its ink, and how much black its lip takes. */
const SHADE = 0.22;

const WHITE = 0xffffff;
const BLACK = 0x000000;

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
 * Returns a tile's body in its cell: a whole number of device pixels in
 * from it on each side, one at least, but a pixel wide at least too, so a
 * cell of a pixel or two, as a canvas has before it is laid out, keeps one.
 */
export function tileBody(cell: Area): Area {
  const gap = Math.max(1, Math.round(cell.width * GAP));
  return inset(cell, Math.min(gap, Math.floor((cell.width - 1) / 2)));
}

/** Returns how round a tile's corners are in its cell, in device pixels, which a frame laid over the tile follows. */
export function tileRadius(cell: Area): number {
  return cell.width * CORNER;
}

/**
 * Returns the chunky tile most kinds of brick are drawn on, in an ink: a
 * darker lip along its bottom, its body, and a lighter strip along its top,
 * three flat shapes, the lip's and the strip's straight edges on whole
 * device pixels.
 */
export function tileCommands(cell: Area, ink: number): readonly DrawCommand[] {
  const body = tileBody(cell);
  const radius = tileRadius(cell);
  const lip = Math.round(cell.width * LIP);
  return [
    roundRect({ ...body, y: body.y + lip, height: body.height - lip }, radius, {
      color: mixColors(BLACK, ink, SHADE),
    }),
    roundRect({ ...body, height: body.height - lip }, radius, { color: ink }),
    polygon(topStrip(body, radius, Math.round(cell.width * STRIP)), {
      color: mixColors(WHITE, ink, SHADE),
    }),
  ];
}

/** Returns the points of the strip along a body's top edge, round its corners, a strip's height deep. */
function topStrip(body: Area, radius: number, strip: number): readonly Point[] {
  const left = { x: body.x + radius, y: body.y + radius };
  const right = { x: body.x + body.width - radius, y: body.y + radius };
  return [
    ...arcPoints(left, radius, Math.PI, 1.5 * Math.PI),
    ...arcPoints(right, radius, 1.5 * Math.PI, 2 * Math.PI),
    ...arcPoints(
      { ...right, y: right.y + strip },
      radius,
      2 * Math.PI,
      1.5 * Math.PI,
    ),
    ...arcPoints(
      { ...left, y: left.y + strip },
      radius,
      1.5 * Math.PI,
      Math.PI,
    ),
  ];
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
