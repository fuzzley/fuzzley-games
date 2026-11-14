// A steel brick, which never breaks: `steel()` in
// `docs/archive/brick-fuzz-pop/art/make-art.mjs`, its frame and rivets cut out
// in the marks' color, as the palette has them (`kinds.steel.glyph`), under
// `@fz/phaser/bricks`' `sheen()`.

import { rivets, sheen } from "@fz/phaser/bricks";
import {
  type Area,
  type ArtScale,
  type DrawCommand,
  share,
  widthOf,
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

/** Where its rivets sit, one in each corner of its frame, as shares of its cell: across, and down. */
const RIVETS = { across: [0.26, 0.74], down: [0.25, 0.68] } as const;

/** A rivet's radius, as a share of its cell. */
const RIVET_RADIUS = 0.04;

/** Returns a steel brick drawn in its cell: a tile of steel, a bevelled frame, a rivet in each of its corners where a scale is detailed, and the sheen. */
function steelCommands(
  cell: Area,
  palette: WallPalette,
  scale: ArtScale,
): readonly DrawCommand[] {
  const { body, glyph } = palette.kinds.steel;
  return [
    ...tileCommands(cell, body),
    crispOutline(share(cell, ...BEVEL), BEVEL_CORNER * cell.width, {
      color: glyph,
      width: widthOf(BEVEL_WIDTH, scale),
    }),
    ...(detailed(scale)
      ? rivets(cell, RIVETS.across, RIVETS.down, RIVET_RADIUS * cell.width, {
          color: glyph,
        })
      : []),
    ...sheen(cell, body, scale.pixelRatio),
  ];
}

/** A steel brick's layers, made once. */
const STEEL_LAYERS = [FRAMES.steel] as const;

/** How a steel brick is drawn: one frame, whatever it has taken, since it takes nothing. */
export const STEEL_ART: KindArt = {
  layersOf: () => STEEL_LAYERS,
  frames: (palette, scale) => [
    cellFrame(FRAMES.steel, scale, (cell) =>
      steelCommands(cell, palette, scale),
    ),
  ],
};
