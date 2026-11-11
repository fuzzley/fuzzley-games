// A shell brick, which only a charge opens: a thick pale shell round a dark
// core, a small bolt in the core over a row of pips for the hits it has
// left, `shell()` in `docs/brick-fuzz-pop/art/make-art.mjs`. Its body is a
// frame of its own, in the shell's own tile, and its pips one for each
// count of them, over it.

import {
  type Area,
  type DrawCommand,
  circle,
  roundRect,
  share,
} from "@fz/phaser/shapes";
import type { KindInks } from "../../colors/palette";
import type { KindArt } from "../art";
import { FRAMES, type FrameName, THICK_HITS } from "../frames";
import { itemAt } from "../../items";
import { boltMark, cellFrame, pointAt } from "../symbols";
import { tileCommands } from "./brick";

/** Where its core lies in its cell, as shares of it: from across and down, wide and tall. */
const CORE = [0.18, 0.18, 0.64, 0.57] as const;

/** How round its core's corners are, as a share of its cell. */
const CORE_CORNER = 0.07;

/** Where its bolt lies in its core, over its pips, as shares of its cell: the bolt's middle, and half its height. */
const BOLT = { across: 0.5, down: 0.4, half: 0.15 } as const;

/** Where its row of pips lies, as shares of its cell: the row's middle, how far apart its pips are and how large each is. */
const PIPS = { across: 0.5, down: 0.655, step: 0.135, radius: 0.044 } as const;

/** A shell brick's layers, by its hits left from 1: its body, and its pips from 2. Made once, so finding a brick's makes nothing. */
const SHELL_LAYERS: readonly (readonly FrameName[])[] = [
  [FRAMES.shellBody],
  ...THICK_HITS.map((hits) => [FRAMES.shellBody, FRAMES.shell(hits)]),
];

/** Returns an area with its edges moved to the nearest whole device pixels, so none blurs. */
function onWholePixels({ x, y, width, height }: Area): Area {
  const left = Math.round(x);
  const top = Math.round(y);
  return {
    x: left,
    y: top,
    width: Math.round(x + width) - left,
    height: Math.round(y + height) - top,
  };
}

/** Returns a shell brick's body drawn in its cell: its tile in its body's color, its core in its face's, and its bolt in its glyph's. */
function bodyCommands(cell: Area, inks: KindInks): readonly DrawCommand[] {
  return [
    ...tileCommands(cell, inks.body),
    roundRect(onWholePixels(share(cell, ...CORE)), CORE_CORNER * cell.width, {
      color: inks.face,
    }),
    boltMark(pointAt(cell, BOLT.across, BOLT.down), BOLT.half * cell.width, {
      color: inks.glyph,
    }),
  ];
}

/** Returns a shell brick's row of pips for its hits left, cut out of its core in its glyph's color. */
function pipsCommands(
  cell: Area,
  hits: number,
  inks: KindInks,
): readonly DrawCommand[] {
  return Array.from({ length: hits }, (_, at) =>
    circle(
      {
        x:
          cell.x +
          (PIPS.across + (at - (hits - 1) / 2) * PIPS.step) * cell.width,
        y: cell.y + PIPS.down * cell.height,
      },
      PIPS.radius * cell.width,
      { color: inks.glyph },
    ),
  );
}

/**
 * How a shell brick is drawn: its body, and its row of pips while it has
 * two hits left or more, as a tough brick's die shows them, so its hits
 * left read at every scale. It brings its body's frame and its pips' to
 * the atlas.
 */
export const SHELL_ART: KindArt = {
  layersOf: ({ hits }) => itemAt(SHELL_LAYERS, hits - 1),
  frames: (palette, scale) => {
    const inks = palette.kinds.shell;
    return [
      cellFrame(FRAMES.shellBody, scale, (cell) => bodyCommands(cell, inks)),
      ...THICK_HITS.map((hits) =>
        cellFrame(FRAMES.shell(hits), scale, (cell) =>
          pipsCommands(cell, hits, inks),
        ),
      ),
    ];
  },
};
