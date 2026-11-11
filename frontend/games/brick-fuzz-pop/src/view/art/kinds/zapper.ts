// A zapper: a dark tile outlined in the warning color, and a bolt along
// each line of bricks it zaps, `zapper()` and `zapBolt()` in
// `docs/brick-fuzz-pop/art/make-art.mjs`. The row's and the column's bolt
// is a zigzag; where two bolts cross, the cross's and the X's, their shafts
// run straight, as two zigzags crossed would make a pinwheel.

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
import type { InkedKind, WallPalette } from "../../colors/palette";
import type { KindArt } from "../art";
import { FRAMES, type FrameName } from "../frames";
import {
  EIGHTH,
  bandAlong,
  cellFrame,
  crispEdge,
  diamond,
  pointAt,
} from "../symbols";

/** The zappers, by the ids the palette keeps their inks under, which the catalog's are. */
export type ZapperKind = Extract<
  InkedKind,
  "rowZapper" | "columnZapper" | "crossZapper" | "xZapper"
>;

/** Points about a cell's middle, as shares of the cell: a shaft's line, or an arrowhead's corners. */
type Shares = readonly (readonly [number, number])[];

/**
 * Describes one of a zapper's bolts: how far it is turned from lying along
 * its row, by the turn's cosine and its sine, so a quarter turn is exact;
 * its shaft; and how much longer it is drawn than a row's, its width with
 * it, so the X's reach toward their tile's corners.
 */
interface Bolt {
  readonly cos: number;
  readonly sin: number;
  readonly shaft: Shares;
  readonly length: number;
}

/** A row's bolt's zigzag shaft, lying along its row, about its cell's middle, as shares of its cell. */
const ZIGZAG: Shares = [
  [-0.28, 0.03],
  [-0.04, -0.09],
  [0.04, 0.09],
  [0.28, -0.03],
];

/** A crossed bolt's straight shaft, lying along its row, about its cell's middle, as shares of its cell. */
const STRAIGHT: Shares = [
  [-0.28, 0],
  [0.28, 0],
];

/** How much longer an X zapper's bolts are drawn than a row's, to reach toward its tile's corners. */
const X_LENGTH = 1.2;

/** Says how each zapper is drawn: its frame, its bolts, and whether a diamond marks where they cross. */
interface Zapper {
  readonly frame: FrameName;
  readonly bolts: readonly Bolt[];
  readonly diamond: boolean;
}

/** How each zapper is drawn. */
const ZAPPERS = {
  rowZapper: {
    frame: FRAMES.zapper("row"),
    bolts: [{ cos: 1, sin: 0, shaft: ZIGZAG, length: 1 }],
    diamond: false,
  },
  columnZapper: {
    frame: FRAMES.zapper("column"),
    bolts: [{ cos: 0, sin: 1, shaft: ZIGZAG, length: 1 }],
    diamond: false,
  },
  crossZapper: {
    frame: FRAMES.zapper("cross"),
    bolts: [
      { cos: 1, sin: 0, shaft: STRAIGHT, length: 1 },
      { cos: 0, sin: 1, shaft: STRAIGHT, length: 1 },
    ],
    diamond: true,
  },
  xZapper: {
    frame: FRAMES.zapper("x"),
    bolts: [
      { cos: EIGHTH, sin: EIGHTH, shaft: STRAIGHT, length: X_LENGTH },
      { cos: EIGHTH, sin: -EIGHTH, shaft: STRAIGHT, length: X_LENGTH },
    ],
    diamond: false,
  },
} as const satisfies Readonly<Record<ZapperKind, Zapper>>;

/** How far in from its cell a zapper's tile lies on each side, as a share of the cell. */
const TILE_GAP = 0.06;

/** How round its tile's corners are, as a share of its cell. */
const TILE_CORNER = 0.12;

/** How wide its tile's outline is, in field units. */
const OUTLINE_WIDTH = 0.04;

/** How wide a bolt's shaft is, as a share of its cell. */
const SHAFT_WIDTH = 0.092;

/** The arrowheads at a bolt's ends, about its cell's middle, as shares of its cell. */
const ARROWHEADS: readonly Shares[] = [
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
];

/**
 * The cross's diamond where its bolts cross, from its middle to each of its
 * points, as shares of its cell: a rim in its face's color, so the shafts
 * stop short of it, round a diamond in the field's text.
 */
const DIAMOND = { rim: 0.155, core: 0.1 } as const;

/** Returns points given about a cell's middle as shares of it, turned and drawn longer as a bolt is, and placed in the cell. */
function aboutMiddle(cell: Area, bolt: Bolt, shares: Shares): readonly Point[] {
  const middle = pointAt(cell, 0.5, 0.5);
  const { cos, sin, length } = bolt;
  return shares.map(([across, down]) => ({
    x: middle.x + (across * cos - down * sin) * length * cell.width,
    y: middle.y + (across * sin + down * cos) * length * cell.height,
  }));
}

/** Returns a bolt drawn in its cell in a color: its shaft, then an arrowhead at each end. */
function boltCommands(
  cell: Area,
  bolt: Bolt,
  color: number,
): readonly DrawCommand[] {
  return [
    polygon(
      bandAlong(
        aboutMiddle(cell, bolt, bolt.shaft),
        SHAFT_WIDTH * bolt.length * cell.width,
      ),
      { color },
    ),
    ...ARROWHEADS.map((head) =>
      polygon(aboutMiddle(cell, bolt, head), { color }),
    ),
  ];
}

/**
 * Returns a zapper drawn in its cell: its tile in its face's color, a whole
 * number of pixels in from it on every side alike, outlined in its body's,
 * its bolts in its glyph's, and the cross's diamond over where its bolts
 * cross, in the field's text on a rim of the face.
 */
function zapperCommands(
  cell: Area,
  palette: WallPalette,
  kind: ZapperKind,
  scale: ArtScale,
): readonly DrawCommand[] {
  const zapper: Zapper = ZAPPERS[kind];
  const inks = palette.kinds[kind];
  const middle = pointAt(cell, 0.5, 0.5);
  const outline = widthOf(OUTLINE_WIDTH, scale);
  // The face is filled about the outline's own edge, so the two stay
  // concentric and none of the face shows past the outline.
  const edge = crispEdge(
    inset(cell, Math.round(TILE_GAP * cell.width)),
    outline,
  );
  const corner = TILE_CORNER * cell.width;
  return [
    roundRect(edge, corner, { color: inks.face }),
    outlineRoundRect(edge, corner, { color: inks.body, width: outline }),
    ...zapper.bolts.flatMap((bolt) => boltCommands(cell, bolt, inks.glyph)),
    ...(zapper.diamond
      ? [
          polygon(diamond(middle, DIAMOND.rim * cell.width), {
            color: inks.face,
          }),
          polygon(diamond(middle, DIAMOND.core * cell.width), {
            color: palette.text,
          }),
        ]
      : []),
  ];
}

/** Returns how a zapper is drawn: one frame, a bolt along each line it zaps. */
export function zapperArt(kind: ZapperKind): KindArt {
  const { frame } = ZAPPERS[kind];
  const layers = [frame];
  return {
    layersOf: () => layers,
    frames: (palette, scale) => [
      cellFrame(frame, scale, (cell) =>
        zapperCommands(cell, palette, kind, scale),
      ),
    ],
  };
}
