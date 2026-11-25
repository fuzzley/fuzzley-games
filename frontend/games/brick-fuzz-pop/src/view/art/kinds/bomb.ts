// A bomb: a round bomb cut out of a tile in the danger color, a short fuse, a
// spark at its end, `@fz/phaser/bricks`' `bombMark()`, and a dot toward each
// of the bricks around it that the spark leaves room for, `bomb()` in
// `docs/archive/brick-fuzz-pop/art/make-art.mjs`.

import { cellFrame, detailed } from "@fz/brick-wall/view/art";
import { bombMark } from "@fz/phaser/bricks";
import {
  type Area,
  type ArtScale,
  type DrawCommand,
  circle,
  within,
} from "@fz/phaser/shapes";
import type { WallPalette } from "../../colors/palette";
import type { KindArt } from "../art";
import { FRAMES } from "../frames";
import { tileCommands } from "./brick";

/**
 * Where its dots sit, toward each brick around it but the one its spark
 * covers, the top right, as shares of its cell: a third of the cell from its
 * face's middle, a little less up and down.
 */
const DOTS: readonly (readonly [number, number])[] = (
  [
    [-1, -1],
    [0, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [0, 1],
    [1, 1],
  ] as const
).map(([across, down]) => [0.5 + across * 0.33, 0.48 + down * 0.31] as const);

/** A dot's radius, as a share of its cell. */
const DOT_RADIUS = 0.027;

/**
 * Returns a bomb drawn in its cell: its tile in its body's color; its dots,
 * where a scale is detailed, its body, its neck and its fuse cut out in its
 * glyph's; the shine on it in its face's; and the spark at its fuse's end.
 */
function bombCommands(
  cell: Area,
  palette: WallPalette,
  scale: ArtScale,
): readonly DrawCommand[] {
  const { body, face, glyph } = palette.kinds.bomb;
  return [
    ...tileCommands(cell, body),
    ...(detailed(scale)
      ? within(cell, DOTS).map((dot) =>
          circle(dot, DOT_RADIUS * cell.width, { color: glyph }),
        )
      : []),
    ...bombMark(
      cell,
      { cut: glyph, shine: face, spark: palette.spark },
      scale.pixelRatio,
    ),
  ];
}

/** A bomb's layers, made once. */
const BOMB_LAYERS = [FRAMES.bomb] as const;

/** How a bomb is drawn: one frame, as it breaks at its first hit. */
export const BOMB_ART: KindArt = {
  layersOf: () => BOMB_LAYERS,
  frames: (palette, scale) => [
    cellFrame(FRAMES.bomb, scale, (cell) => bombCommands(cell, palette, scale)),
  ],
};
