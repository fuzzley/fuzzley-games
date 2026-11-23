// The frames the field adds to the atlas beside the bricks' and the
// fuzzball's: the dots it is drawn with, the warning frame round a brick
// one step from losing the level, and a floor bounce's spring in the floor's
// band, unlit and lit, after `floorBounce()` in
// `docs/rickashay/art/make-art.mjs`. Each is baked, so it is round and
// sharp where a live `Graphics` would draw it unsmoothed and anew each
// frame.

import {
  type Area,
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  type LineStyle,
  type Point,
  circle,
  inset,
  stroke,
  widthOf,
} from "@fz/phaser/shapes";
import { SPRING_UNITS } from "../field/springs";
import type { WallPalette } from "../colors/palette";
import { cellOf } from "./cells";
import { FRAMES } from "./frames";
import { CUT_TILE } from "./kinds/brick";
import { CUT_GROWTH, cutOutline } from "./kinds/steel";

/**
 * The names of the field's own frames, which the art's `FRAMES` doesn't
 * list: a dot at each corner the cells share, a dot of the jump line's
 * count, one for each brick left under it, and the warning frame.
 */
export const FIELD_FRAMES = {
  gridDot: "grid-dot",
  countDot: "count-dot",
  warning: "warning-frame",
} as const satisfies Readonly<Record<string, string>>;

/** How wide a dot of the grid is, in field units: 2.2 of a cell of 40, Brick Fuzz Pop's. */
export const GRID_DOT = 0.055;

/** How wide a dot of the jump line's count is, in field units, Brick Fuzz Pop's. */
export const COUNT_DOT = 0.14;

/**
 * Says how the warning frame is drawn, in field units: its band in the
 * danger color, in from its cell's edge, and the seam in the field's color
 * inside it, which keeps it apart from a tile of a color near the danger
 * color, its corners cut as a tile's are.
 */
export const WARNING_FRAME = {
  band: 0.08,
  seam: 0.03,
} as const satisfies Readonly<Record<string, number>>;

/**
 * Says how a floor bounce's spring is drawn, as shares of its square, as
 * the art draws it: its middle across, its top plate and its foot, half its
 * width, its turns, and its line's width, drawn a CSS pixel wide at least.
 * An unlit spring stands squashed to {@link SQUASHED} of its height, so it
 * differs from a lit one by its shape, not by its color alone, as two of
 * them are about as dark in Classic felt.
 */
export const SPRING = {
  across: 0.5,
  top: 0.2,
  foot: 0.8,
  half: 0.26,
  turns: 3,
  width: 0.09,
} as const satisfies Readonly<Record<string, number>>;

/** How much of a lit spring's height an unlit one stands, squashed. */
export const SQUASHED = 0.5;

/**
 * Returns the field's own frames, drawn in a palette at a scale: the grid's
 * dot in the field's line and the count's in the jump line's color, each a
 * CSS pixel wide at least, and the warning frame, a cell's.
 */
export function fieldFrames(
  palette: WallPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  return [
    dotFrame(FIELD_FRAMES.gridDot, widthOf(GRID_DOT, scale), palette.line),
    dotFrame(
      FIELD_FRAMES.countDot,
      widthOf(COUNT_DOT, scale),
      palette.jumpLine,
    ),
    warningFrame(palette, scale),
  ];
}

/**
 * Returns a floor bounce's spring, unlit and lit, drawn in a palette at a
 * scale, each a square as wide as a spring is at most: unlit squashed, in
 * the springs' off color, and lit at its height, in their on.
 */
export function springFrames(
  palette: WallPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  const side = widthOf(SPRING_UNITS, scale);
  const width = widthOf(SPRING.width * SPRING_UNITS, scale);
  const { off, on } = palette.springs;
  return [
    {
      name: FRAMES.bounceOff,
      width: side,
      height: side,
      commands: coil(side, SQUASHED, { color: off, width }),
    },
    {
      name: FRAMES.bounceOn,
      width: side,
      height: side,
      commands: coil(side, 1, { color: on, width }),
    },
  ];
}

/** Returns a frame of a dot that fills it, some device pixels wide, in a color. */
export function dotFrame(name: string, side: number, color: number): ArtFrame {
  const half = side / 2;
  return {
    name,
    width: side,
    height: side,
    commands: [circle({ x: half, y: half }, half, { color })],
  };
}

/**
 * Returns the warning frame: a cell, a band of the danger line's color in
 * along its edge, and a seam of the field's color inside the band, each a
 * CSS pixel wide at least, their corners cut as a tile's.
 */
function warningFrame(palette: WallPalette, scale: ArtScale): ArtFrame {
  const cell = cellOf(scale);
  const band = widthOf(WARNING_FRAME.band, scale);
  const seam = widthOf(WARNING_FRAME.seam, scale);
  const cut = CUT_TILE.cut * cell.width;
  return {
    name: FIELD_FRAMES.warning,
    width: cell.width,
    height: cell.height,
    commands: [
      bandIn(cell, cut, 0, { color: palette.dangerLine, width: band }),
      bandIn(cell, cut, band, { color: palette.field, width: seam }),
    ],
  };
}

/**
 * Returns a band round a cell, some way in from its edge, its corners cut
 * as the cell's own cut runs that far in, as steel's frame is drawn.
 */
function bandIn(
  cell: Area,
  cut: number,
  from: number,
  style: LineStyle,
): DrawCommand {
  const middle = from + style.width / 2;
  return cutOutline(
    inset(cell, middle),
    Math.max(0, cut - middle * CUT_GROWTH),
    style,
  );
}

/**
 * Returns a coil spring in a square some device pixels wide, as tall as a
 * share of a lit one, on the same foot, in a line's style: its top plate,
 * its turns zigzagging from side to side, and its foot, each round at its
 * ends and corners.
 */
function coil(
  side: number,
  tall: number,
  style: LineStyle,
): readonly DrawCommand[] {
  const middle = SPRING.across * side;
  const half = SPRING.half * side;
  const foot = SPRING.foot * side;
  const top = foot - (SPRING.foot - SPRING.top) * tall * side;
  const step = (foot - top) / (SPRING.turns + 1);
  const zigzag: Point[] = [{ x: middle, y: top }];
  for (let turn = 0; turn < SPRING.turns; turn++) {
    zigzag.push({
      x: middle + (turn % 2 === 0 ? half : -half),
      y: top + step * (turn + 1),
    });
  }
  zigzag.push({ x: middle, y: foot });
  return [
    ...stroke(
      [
        { x: middle - half, y: top },
        { x: middle + half, y: top },
      ],
      style,
    ),
    ...stroke(zigzag, style),
    ...stroke(
      [
        { x: middle - half, y: foot },
        { x: middle + half, y: foot },
      ],
      style,
    ),
  ];
}
