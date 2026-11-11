// A bumper, which kicks a fuzzball off it: round, not square, a disc on a
// darker shadow, a ring cut out of it, a lighter cap in its middle, and four
// ticks kicking out toward its cell's corners, `bumper()` in
// `docs/brick-fuzz-pop/art/make-art.mjs`.

import { mixColors } from "@fz/phaser/color";
import {
  type Area,
  type ArtScale,
  type DrawCommand,
  type Point,
  circle,
  placed,
  ring,
  stroke,
  widthOf,
} from "@fz/phaser/shapes";
import type { WallPalette } from "../../colors/palette";
import type { KindArt } from "../art";
import { FRAMES } from "../frames";
import { EIGHTH, cellFrame, pointAt } from "../symbols";

/** The ways its four ticks kick out from its cell's middle, toward its corners, from the bottom right clockwise. */
const TICK_WAYS: readonly Point[] = [
  { x: EIGHTH, y: EIGHTH },
  { x: -EIGHTH, y: EIGHTH },
  { x: -EIGHTH, y: -EIGHTH },
  { x: EIGHTH, y: -EIGHTH },
];

/** How far from its cell's middle each tick runs, from and to, as shares of the cell, and how wide it is, in field units. */
const TICK = { from: 0.435, to: 0.495, width: 0.05 } as const;

/** Its disc: where its middle lies, a little above its cell's, and its radius, as shares of its cell. */
const DISC = { across: 0.5, down: 0.485, radius: 0.37 } as const;

/** How far below its disc its shadow lies, as a share of its cell. */
const SHADOW_DROP = 0.035;

/** How much black its shadow takes over its disc's color. */
const SHADOW_SHADE = 0.28;

/** The ring cut out of its disc: its radius, the middle of its band, as a share of its cell, and how wide it is, in field units. */
const RING = { radius: 0.24, width: 0.075 } as const;

/** The cap in its middle: its radius, as a share of its cell, and how much white it takes over its disc's color. */
const CAP = { radius: 0.105, light: 0.52 } as const;

const WHITE = 0xffffff;
const BLACK = 0x000000;

/**
 * Returns a bumper drawn in its cell: its ticks in its body's color, round
 * at their ends, then its disc in its face's on a shadow darker, its ring
 * in its glyph's, and its cap lighter.
 */
function bumperCommands(
  cell: Area,
  palette: WallPalette,
  scale: ArtScale,
): readonly DrawCommand[] {
  const { body, face, glyph } = palette.kinds.bumper;
  const tick = { color: body, width: widthOf(TICK.width, scale) };
  const middle = pointAt(cell, 0.5, 0.5);
  const disc = pointAt(cell, DISC.across, DISC.down);
  const radius = DISC.radius * cell.width;
  return [
    ...TICK_WAYS.flatMap((way) =>
      stroke(
        [TICK.from, TICK.to].flatMap((reach) =>
          placed([way], reach * cell.width, middle),
        ),
        tick,
      ),
    ),
    circle({ x: disc.x, y: disc.y + SHADOW_DROP * cell.height }, radius, {
      color: mixColors(BLACK, face, SHADOW_SHADE),
    }),
    circle(disc, radius, { color: face }),
    ring(disc, RING.radius * cell.width, {
      color: glyph,
      width: widthOf(RING.width, scale),
    }),
    circle(disc, CAP.radius * cell.width, {
      color: mixColors(WHITE, face, CAP.light),
    }),
  ];
}

/** A bumper's layers, made once. */
const BUMPER_LAYERS = [FRAMES.bumper] as const;

/** How a bumper is drawn: one frame, as it never breaks. */
export const BUMPER_ART: KindArt = {
  layersOf: () => BUMPER_LAYERS,
  colorOf: (_, palette) => palette.kinds.bumper.body,
  frames: (palette, scale) => [
    cellFrame(FRAMES.bumper, scale, (cell) =>
      bumperCommands(cell, palette, scale),
    ),
  ],
};
