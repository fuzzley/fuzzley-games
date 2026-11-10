// A tough brick: its row's tile under a die's pips for the hits it has left
// and a crack for each hit it has taken, `tough()` in
// `docs/brick-fuzz-pop/art/make-art.mjs`. The pips and the cracks are frames
// of their own, which the kinds that count their hits stack over a tile too.

import {
  type Area,
  type DrawCommand,
  type LineStyle,
  type Point,
  polygon,
  widthOf,
  within,
} from "@fz/phaser/shapes";
import { inkAt } from "../../colors/inks";
import type { KindArt } from "../art";
import { CRACKS, FRAMES, type FrameName, INKS, PIPS } from "../frames";
import { bandAlong, cellFrame, detailed, diePips, itemAt } from "../symbols";
import { tileBody, tileFrame } from "./brick";

/** The pips' frames, from 2 pips: a brick with a hit left shows none. */
const PIPS_FRAMES: readonly FrameName[] = PIPS.map((pips) => FRAMES.pips(pips));

/** The cracks' frames, from 1 crack. */
const CRACKS_FRAMES: readonly FrameName[] = CRACKS.map((cracks) =>
  FRAMES.cracks(cracks),
);

/** Where a die's middle pip sits in its cell, and how far apart its pips are, as shares of the cell. */
const DIE = { across: 0.5, down: 0.48, step: 0.2, radius: 0.066 } as const;

/** How wide a crack is, in field units. */
const CRACK_WIDTH = 0.032;

/** Says how a crack runs: along the edge of its tile it starts on, and in from it. */
interface Crack {
  /** The way along the edge it starts on, which its first end is cut along. */
  readonly edge: Point;
  /** Its zigzag, as shares of its tile's body, from a point on that edge. */
  readonly path: readonly (readonly [number, number])[];
}

/** The way along a tile's top or bottom edge. */
const ACROSS: Point = { x: 1, y: 0 };

/** The way along a tile's left or right edge. */
const DOWN: Point = { x: 0, y: 1 };

/**
 * Each crack a brick gathers, a hit it took, in the order it gathers them: a
 * zigzag in from an edge of its tile, each clear of every pip a die shows.
 */
const CRACK_PATHS: readonly Crack[] = [
  {
    edge: ACROSS,
    path: [
      [0.41, 0],
      [0.47, 0.09],
      [0.39, 0.16],
      [0.46, 0.28],
    ],
  },
  {
    edge: DOWN,
    path: [
      [1, 0.59],
      [0.9, 0.54],
      [0.86, 0.63],
      [0.81, 0.59],
    ],
  },
  {
    edge: DOWN,
    path: [
      [0, 0.39],
      [0.09, 0.43],
      [0.14, 0.35],
      [0.2, 0.37],
    ],
  },
  {
    edge: ACROSS,
    path: [
      [0.59, 1],
      [0.54, 0.91],
      [0.62, 0.85],
      [0.55, 0.76],
    ],
  },
  {
    edge: ACROSS,
    path: [
      [0.8, 0],
      [0.75, 0.07],
      [0.84, 0.11],
      [0.83, 0.17],
    ],
  },
];

/**
 * Returns the name of the frame of a brick's pips for the hits it has left,
 * 2 to 6.
 *
 * @throws {RangeError} for a count no pips frame shows.
 */
export function pipsFrame(hits: number): FrameName {
  return itemAt(PIPS_FRAMES, hits - 2);
}

/**
 * Returns the name of the frame of a brick's cracks for the hits it has
 * taken, 1 to 5.
 *
 * @throws {RangeError} for a count no cracks frame shows.
 */
export function cracksFrame(taken: number): FrameName {
  return itemAt(CRACKS_FRAMES, taken - 1);
}

/** The hits a tough brick may have when whole or left, 1 to the most a die shows. */
const HITS = [1, ...PIPS];

/**
 * A tough brick's layers, by tint, then by its hits when whole and left,
 * each from 1: its tile, its pips while it has two hits left or more, and
 * its cracks once it has taken one. Made once, so finding a brick's makes
 * nothing.
 */
const TOUGH_LAYERS: readonly (readonly (readonly (readonly FrameName[])[])[])[] =
  INKS.map((tint) =>
    HITS.map((full) =>
      HITS.filter((hits) => hits <= full).map((hits) => [
        tileFrame(tint),
        ...(hits > 1 ? [pipsFrame(hits)] : []),
        ...(full > hits ? [cracksFrame(full - hits)] : []),
      ]),
    ),
  );

/** Returns a die's face of pips, cut out in a color, in the middle of a cell. */
function pipsCommands(
  cell: Area,
  pips: number,
  color: number,
): readonly DrawCommand[] {
  return diePips(
    pips,
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
 * Returns the first cracks of a cell's tile, cut out in a color, a line
 * wide: each a band, its corners mitred as the art's are, so no renderer's
 * joins reach past it, its inner end cut square, and its outer end cut along
 * the tile's edge, so it paints nothing outside the tile.
 */
function cracksCommands(
  cell: Area,
  cracks: number,
  style: LineStyle,
): readonly DrawCommand[] {
  const body = tileBody(cell);
  return CRACK_PATHS.slice(0, cracks).map(({ edge, path }) =>
    polygon(bandAlong(within(body, path), style.width, edge), style),
  );
}

/**
 * How a tough brick is drawn: its row's tile, its pips while it has two
 * hits left or more, and its cracks once it has taken one. It brings the
 * pips' and the cracks' frames to the atlas, the cracks drawn only at a
 * scale that shows the finest detail.
 */
export const TOUGH_ART: KindArt = {
  layersOf: ({ tint, hits, full }) =>
    itemAt(itemAt(itemAt(TOUGH_LAYERS, tint), full - 1), hits - 1),
  colorOf: ({ tint }, palette) => inkAt(palette.tints, tint),
  frames: (palette, scale) => {
    const crack = {
      color: palette.mark,
      width: widthOf(CRACK_WIDTH, scale),
    };
    return [
      ...PIPS.map((pips) =>
        cellFrame(FRAMES.pips(pips), scale, (cell) =>
          pipsCommands(cell, pips, palette.mark),
        ),
      ),
      ...CRACKS.map((cracks) =>
        cellFrame(FRAMES.cracks(cracks), scale, (cell) =>
          detailed(scale) ? cracksCommands(cell, cracks, crack) : [],
        ),
      ),
    ];
  },
};
