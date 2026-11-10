// A steel brick, which never breaks: `steel()` in
// `docs/brick-fuzz-pop/art/make-art.mjs`, its frame and rivets cut out in the
// marks' color, as the palette has them (`kinds.steel.glyph`).

import { mixColors } from "@fz/phaser/color";
import {
  type Area,
  type ArtScale,
  type DrawCommand,
  circle,
  share,
  stroke,
  widthOf,
  within,
} from "@fz/phaser/shapes";
import type { WallPalette } from "../../colors/palette";
import type { KindArt } from "../art";
import { FRAMES } from "../frames";
import { cellFrame, crispOutline, detailed } from "../symbols";
import { tileCommands } from "./brick";

/** Where its bevelled frame lies in its cell, as shares of it: from across and down, wide and tall. */
const BEVEL = [0.145, 0.14, 0.71, 0.655] as const;

/** How round its frame's corners are, as a share of its cell. */
const BEVEL_CORNER = 0.07;

/** How wide its frame is, in field units. */
const BEVEL_WIDTH = 0.034;

/** Where its rivets sit, one in each corner of its frame, as shares of its cell. */
const RIVETS = [
  [0.26, 0.25],
  [0.74, 0.25],
  [0.26, 0.68],
  [0.74, 0.68],
] as const;

/** A rivet's radius, as a share of its cell. */
const RIVET_RADIUS = 0.04;

/** Its two strokes of sheen, each from one end to the other, as shares of its cell. */
const SHEEN = [
  [
    [0.38, 0.57],
    [0.56, 0.39],
  ],
  [
    [0.5, 0.61],
    [0.63, 0.48],
  ],
] as const;

/** How wide a stroke of sheen is, in field units. */
const SHEEN_WIDTH = 0.046;

/** How much white its sheen takes over the steel. */
const SHEEN_LIGHT = 0.5;

/** Returns a steel brick drawn in its cell: a tile of steel, a bevelled frame, a rivet in each of its corners where a scale is detailed, and two strokes of sheen. */
function steelCommands(
  cell: Area,
  palette: WallPalette,
  scale: ArtScale,
): readonly DrawCommand[] {
  const { body, glyph } = palette.kinds.steel;
  const sheen = {
    color: mixColors(0xffffff, body, SHEEN_LIGHT),
    width: widthOf(SHEEN_WIDTH, scale),
  };
  return [
    ...tileCommands(cell, body),
    crispOutline(share(cell, ...BEVEL), BEVEL_CORNER * cell.width, {
      color: glyph,
      width: widthOf(BEVEL_WIDTH, scale),
    }),
    ...(detailed(scale)
      ? within(cell, RIVETS).map((middle) =>
          circle(middle, RIVET_RADIUS * cell.width, { color: glyph }),
        )
      : []),
    ...SHEEN.flatMap((points) => stroke(within(cell, points), sheen)),
  ];
}

/** A steel brick's layers, made once. */
const STEEL_LAYERS = [FRAMES.steel] as const;

/** How a steel brick is drawn: one frame, whatever it has taken, since it takes nothing. */
export const STEEL_ART: KindArt = {
  layersOf: () => STEEL_LAYERS,
  colorOf: (_, palette) => palette.kinds.steel.body,
  frames: (palette, scale) => [
    cellFrame(FRAMES.steel, scale, (cell) =>
      steelCommands(cell, palette, scale),
    ),
  ],
};
