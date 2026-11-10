// A zapper: a dark tile outlined in the warning color, and a bolt along the
// line of bricks it zaps, `zapper()` and `zapBolt()` in
// `docs/brick-fuzz-pop/art/make-art.mjs`. The row's and the column's so far;
// the cross's and the X's come with their kinds.

import {
  type Area,
  type ArtScale,
  type DrawCommand,
  type Point,
  inset,
  outlineRoundRect,
  polygon,
  roundRect,
  widthOf,
} from "@fz/phaser/shapes";
import type { BrickKindId } from "../../../rules/catalog/bricks";
import type { KindInks } from "../../colors/palette";
import type { KindArt } from "../art";
import { FRAMES, type FrameName } from "../frames";
import { bandAlong, cellFrame, crispEdge } from "../symbols";

/** The zappers drawn so far, by the catalog's ids. */
export type ZapperKind = Extract<BrickKindId, "rowZapper" | "columnZapper">;

/** Describes a turn about a cell's middle, by its cosine and its sine, so a quarter turn is exact. */
interface Turn {
  readonly cos: number;
  readonly sin: number;
}

/** How each zapper is drawn: its frame, and how far its bolt is turned from lying along its row. */
const ZAPPERS = {
  rowZapper: { frame: FRAMES.zapper("row"), turn: { cos: 1, sin: 0 } },
  columnZapper: { frame: FRAMES.zapper("column"), turn: { cos: 0, sin: 1 } },
} as const satisfies Readonly<
  Record<ZapperKind, { readonly frame: FrameName; readonly turn: Turn }>
>;

/** How far in from its cell a zapper's tile lies on each side, as a share of the cell. */
const TILE_GAP = 0.06;

/** How round its tile's corners are, as a share of its cell. */
const TILE_CORNER = 0.12;

/** How wide its tile's outline is, in field units. */
const OUTLINE_WIDTH = 0.04;

/** A bolt's zigzag shaft, lying along its row, about its cell's middle, as shares of its cell. */
const ZIGZAG = [
  [-0.28, 0.03],
  [-0.04, -0.09],
  [0.04, 0.09],
  [0.28, -0.03],
] as const;

/** How wide a bolt's shaft is, as a share of its cell. */
const SHAFT_WIDTH = 0.092;

/** The arrowheads at a bolt's ends, about its cell's middle, as shares of its cell. */
const ARROWHEADS = [
  [
    [0.4, 0],
    [0.24, -0.125],
    [0.24, 0.125],
  ],
  [
    [-0.4, 0],
    [-0.24, -0.125],
    [-0.24, 0.125],
  ],
] as const;

/** Returns points given about a cell's middle as shares of it, turned, and placed in the cell. */
function aboutMiddle(
  cell: Area,
  turn: Turn,
  shares: readonly (readonly [number, number])[],
): readonly Point[] {
  const middle = { x: cell.x + cell.width / 2, y: cell.y + cell.height / 2 };
  return shares.map(([across, down]) => ({
    x: middle.x + (across * turn.cos - down * turn.sin) * cell.width,
    y: middle.y + (across * turn.sin + down * turn.cos) * cell.height,
  }));
}

/** Returns a zapper drawn in its cell: its tile in its face's color, a whole number of pixels in from it on every side alike, outlined in its body's, and its bolt in its glyph's. */
function zapperCommands(
  cell: Area,
  inks: KindInks,
  turn: Turn,
  scale: ArtScale,
): readonly DrawCommand[] {
  const outline = widthOf(OUTLINE_WIDTH, scale);
  // The face is filled about the outline's own edge, so the two stay
  // concentric and none of the face shows past the outline.
  const edge = crispEdge(
    inset(cell, Math.round(TILE_GAP * cell.width)),
    outline,
  );
  const corner = TILE_CORNER * cell.width;
  const bolt = { color: inks.glyph };
  return [
    roundRect(edge, corner, { color: inks.face }),
    outlineRoundRect(edge, corner, { color: inks.body, width: outline }),
    polygon(
      bandAlong(aboutMiddle(cell, turn, ZIGZAG), SHAFT_WIDTH * cell.width),
      bolt,
    ),
    ...ARROWHEADS.map((head) => polygon(aboutMiddle(cell, turn, head), bolt)),
  ];
}

/** Returns how a zapper is drawn: one frame, its bolt along the line it zaps. */
export function zapperArt(kind: ZapperKind): KindArt {
  const { frame, turn } = ZAPPERS[kind];
  const layers = [frame];
  return {
    layersOf: () => layers,
    colorOf: (_, palette) => palette.kinds[kind].body,
    frames: (palette, scale) => [
      cellFrame(frame, scale, (cell) =>
        zapperCommands(cell, palette.kinds[kind], turn, scale),
      ),
    ],
  };
}
