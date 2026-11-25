// A hatch, which a fuzzball rises through and is held up by coming down:
// `hatch()` in `docs/rickashay/art/make-art.mjs`. It has no tile: a steel
// bar along the top of its cell, the width of the cell, so hatches side by
// side draw one bar, as the flight meets them, with a dot cut out of it for
// each hold the hatches have left, and two chevrons under it, pointing up,
// the way a fuzzball passes it. A hatch that has swung open shows two short
// posts at its cell's sides, the bar gone, the chevrons left.
//
// A hatch's look is the flight's, not its own: the view writes it into the
// wall it draws as the hatch's tint, `hatchTint()` in `../hatch_tint.ts`,
// so the bars lose a dot at each hold and open at the last, and a wall the
// rules make, every hatch's tint 0, shows them whole.
//
// The bar's ends are drawn square, as the art draws them, though the flight
// cuts an end where nothing stands beside it: a kind's look holds nothing
// of the bricks about it, and the tint holds the holds.

import { cellFrame } from "@fz/brick-wall/view/art";
import { mixColors } from "@fz/phaser/color";
import {
  type Area,
  type ArtScale,
  type DrawCommand,
  type Point,
  circle,
  lineWidth,
  rect,
  stroke,
  widthOf,
  within,
} from "@fz/phaser/shapes";
import type { WallPalette } from "../../colors/palette";
import type { KindArt } from "../art";
import {
  FRAMES,
  type FrameName,
  HATCH_HOLDS,
  type HatchHolds,
} from "../frames";
import { itemAt } from "../items";

/** Where the bar runs down its cell, as shares of it, the art's: from its top to its foot, and its bright edge along its top. */
const BAR = { top: 0.02, foot: 0.2, edge: 0.06 } as const;

/** How much white the bar's bright edge takes over the steel, the art's. */
const EDGE_WHITE = 0.42;

/** How wide the seam between the bar's two leaves is, in field units, and how much black it takes over the steel, the art's. */
const SEAM = { width: 0.02, black: 0.34 } as const;

/**
 * How the dots sit along the bar, as shares of its cell, the art's: how
 * far apart they are, and how round each is. They sit about the middle of
 * the bar under its bright edge, a little under the art's middle of the
 * whole bar, so that no dot reaches into the edge at any scale.
 */
const DOTS = { step: 0.14, radius: 0.036 } as const;

/** The two chevrons under the bar, each through its points as shares of its cell, the art's, pointing up. */
const CHEVRONS = [
  [
    [0.33, 0.6],
    [0.5, 0.44],
    [0.67, 0.6],
  ],
  [
    [0.33, 0.84],
    [0.5, 0.68],
    [0.67, 0.84],
  ],
] as const satisfies readonly (readonly (readonly [number, number])[])[];

/**
 * How an open hatch's two posts, its leaves hanging down, stand against
 * its cell's sides, from where the bar's top was, as shares of the cell,
 * the art's: how far down each reaches, and how wide it is. They are drawn
 * in the chevrons' color, where the art fades the steel toward the field,
 * which keeps under 3:1 against the field in four palettes, and without
 * the art's hinge holes, too small to read on a post a few pixels wide.
 */
const POSTS = { tall: 0.5, wide: 0.09 } as const;

/**
 * A hatch's layers, by its tint, the dots its bar has lost: all three,
 * then two, one, and none, the hatch open. Made once, so finding a hatch's
 * makes nothing.
 */
const HATCH_LAYERS: readonly (readonly FrameName[])[] = [
  ...[...HATCH_HOLDS].reverse().map((holds) => [FRAMES.hatch(holds)]),
  [FRAMES.hatchOpen],
];

/** Returns the two chevrons in a cell, round at their ends and corners, in a color. */
function chevronCommands(
  cell: Area,
  color: number,
  scale: ArtScale,
): readonly DrawCommand[] {
  const style = { color, width: lineWidth(scale) };
  return CHEVRONS.flatMap((shares) => stroke(within(cell, shares), style));
}

/** Returns a hatch's bar in its cell, with a dot for each of some holds left, its edges on whole device pixels. */
function barCommands(
  cell: Area,
  holds: HatchHolds,
  palette: WallPalette,
  scale: ArtScale,
): readonly DrawCommand[] {
  const { steel, mark } = palette;
  const top = cell.y + Math.round(BAR.top * cell.height);
  const foot = cell.y + Math.round(BAR.foot * cell.height);
  const edge = cell.y + Math.round(BAR.edge * cell.height);
  const middle = cell.x + cell.width / 2;
  const seam = widthOf(SEAM.width, scale);
  const dots: readonly Point[] = Array.from({ length: holds }, (_, i) => ({
    x: middle + (i - (holds - 1) / 2) * DOTS.step * cell.width,
    y: (edge + foot) / 2,
  }));
  return [
    rect(
      { x: cell.x, y: top, width: cell.width, height: foot - top },
      { color: steel },
    ),
    rect(
      { x: cell.x, y: top, width: cell.width, height: edge - top },
      { color: mixColors(0xffffff, steel, EDGE_WHITE) },
    ),
    rect(
      {
        x: Math.round(middle - seam / 2),
        y: edge,
        width: seam,
        height: foot - edge,
      },
      { color: mixColors(0x000000, steel, SEAM.black) },
    ),
    ...dots.map((dot) =>
      circle(dot, DOTS.radius * cell.width, { color: mark }),
    ),
  ];
}

/** Returns an open hatch's two posts in its cell, in a color, their edges on whole device pixels. */
function postCommands(cell: Area, color: number): readonly DrawCommand[] {
  const width = Math.round(POSTS.wide * cell.width);
  const top = cell.y + Math.round(BAR.top * cell.height);
  const height = Math.round(POSTS.tall * cell.height);
  return [
    rect({ x: cell.x, y: top, width, height }, { color }),
    rect({ x: cell.x + cell.width - width, y: top, width, height }, { color }),
  ];
}

/**
 * How a hatch is drawn: its bar with a dot for each hold the hatches have
 * left, by its tint, as the view writes it, and its chevrons, or once the
 * hatches open, its posts and its chevrons. It brings a bar of 1, 2 and 3
 * dots and an open hatch to the atlas.
 */
export const HATCH_ART = {
  layersOf: ({ tint }) => itemAt(HATCH_LAYERS, tint),
  frames: (palette, scale) => [
    ...HATCH_HOLDS.map((holds) =>
      cellFrame(FRAMES.hatch(holds), scale, (cell) => [
        ...chevronCommands(cell, palette.chevrons, scale),
        ...barCommands(cell, holds, palette, scale),
      ]),
    ),
    cellFrame(FRAMES.hatchOpen, scale, (cell) => [
      ...chevronCommands(cell, palette.chevrons, scale),
      ...postCommands(cell, palette.chevrons),
    ]),
  ],
} as const satisfies KindArt;
