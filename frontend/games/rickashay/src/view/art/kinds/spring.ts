// A spring brick, whose break gives the flight a floor bounce: `spring()`
// in `docs/rickashay/art/make-art.mjs`, a pink tile with a coil spring cut
// out of it, the spring a floor bounce is drawn as. The tile is the pink
// ink's, which a brick in a pink row shows too, and the coil a frame of its
// own over it, cut out in the marks' color, the field's.

import { cellFrame } from "@fz/brick-wall/view/art";
import { TINT } from "@fz/brick-wall/view/inks";
import {
  type Area,
  type DrawCommand,
  type LineStyle,
  type Point,
  bandAlong,
  polygon,
  stroke,
  widthOf,
} from "@fz/phaser/shapes";
import type { KindArt } from "../art";
import { coilLines } from "../coil";
import { FRAMES } from "../frames";

/**
 * Says how the coil is drawn, as shares of its cell, the art's: its middle
 * across, its top plate and its foot, half its width, the turns of its
 * zigzag between them, and its line's width, in field units.
 */
const COIL = {
  across: 0.5,
  top: 0.24,
  foot: 0.72,
  half: 0.19,
  turns: 4,
  width: 0.064,
} as const satisfies Readonly<Record<string, number>>;

/** The way along the top plate, which the zigzag's first end is cut along. */
const ACROSS: Point = { x: 1, y: 0 };

/** A spring brick's layers, the pink tile and the coil over it, made once. */
const SPRING_LAYERS = [FRAMES.tile(TINT.pink), FRAMES.spring] as const;

/**
 * Returns the coil in a cell, in a line's style: its top plate and its
 * foot, each round at its ends, and the zigzag between them as one band,
 * its corners mitred as the art's are, so no renderer's joins reach past
 * it, its first end cut along the top plate.
 */
function coilCommands(cell: Area, style: LineStyle): readonly DrawCommand[] {
  const { top, zigzag, foot } = coilLines({
    middle: cell.x + COIL.across * cell.width,
    top: cell.y + COIL.top * cell.height,
    foot: cell.y + COIL.foot * cell.height,
    half: COIL.half * cell.width,
    turns: COIL.turns,
  });
  return [
    ...stroke(top, style),
    polygon(bandAlong(zigzag, style.width, ACROSS), style),
    ...stroke(foot, style),
  ];
}

/**
 * How a spring brick is drawn: the pink tile, whatever its row, and a coil
 * spring cut out of it. It brings the coil's frame to the atlas, drawn at
 * every scale, since it is what tells the kind.
 */
export const SPRING_ART = {
  layersOf: (_) => SPRING_LAYERS,
  frames: (palette, scale) => [
    cellFrame(FRAMES.spring, scale, (cell) =>
      coilCommands(cell, {
        color: palette.mark,
        width: widthOf(COIL.width, scale),
      }),
    ),
  ],
} as const satisfies KindArt;
