// The guide's frames, as the design's "Look" has it and
// `docs/rickashay/art/make-art.mjs` draws it: a dot of the guide's color,
// the field's text, along the flight, and a ring of it at each turn; and,
// round each brick the flight strikes on the way, a band of it along the
// cell's edge, its corners cut as a tile's.

import { cellArea, dotFrame } from "@fz/brick-wall/view/art";
import {
  type ArtFrame,
  type ArtScale,
  centered,
  ring,
  widthOf,
} from "@fz/phaser/shapes";
import type { WallPalette } from "../colors/palette";
import { bandIn } from "./field_frames";
import { FRAMES } from "./frames";
import { CUT_TILE } from "./kinds/brick";

/** The names of the guide's frames beside its dot and its ring, which `FRAMES` names: the band round a brick it strikes. */
export const GUIDE_FRAMES = {
  struck: "guide-struck",
} as const satisfies Readonly<Record<string, string>>;

/** How wide a dot of the guide is, in field units, as the art draws it: 4.8 of a cell of 40. */
export const GUIDE_DOT = 0.12;

/**
 * Says how the ring at each of the guide's turns is drawn, in field units,
 * as the art draws it: its line's middle 0.2 out from the turn, and its
 * line 0.05 wide, a CSS pixel at least.
 */
export const GUIDE_RING = {
  radius: 0.2,
  width: 0.05,
} as const satisfies Readonly<Record<string, number>>;

/**
 * Says how the band round a brick the guide strikes is drawn, in field
 * units, each a CSS pixel wide at least: the band, as wide as Brick Fuzz
 * Pop's outline of a brick its guide punches, and a seam of the field's
 * color inside it. The guide's color keeps 3:1 against the field but not
 * against every brick's, so the seam parts the band from the tile, as the
 * warning frame's does.
 */
export const GUIDE_STRUCK = {
  band: 0.055,
  seam: 0.03,
} as const satisfies Readonly<Record<string, number>>;

/**
 * Returns the guide's frames, drawn in a palette at a scale: its dot, a
 * CSS pixel wide at least, in the guide's color; the ring at a turn, about
 * its middle, in the guide's rings'; and the band round a brick it
 * strikes, a cell, in the guide's color with a seam of the field's inside.
 */
export function guideFrames(
  palette: WallPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  const cell = cellArea(scale);
  const cut = CUT_TILE.cut * cell.width;
  const band = widthOf(GUIDE_STRUCK.band, scale);
  return [
    dotFrame(FRAMES.guideDot, widthOf(GUIDE_DOT, scale), palette.guide),
    centered(FRAMES.guideRing, [
      ring({ x: 0, y: 0 }, GUIDE_RING.radius * scale.unit, {
        color: palette.guideRing,
        width: widthOf(GUIDE_RING.width, scale),
      }),
    ]),
    {
      name: GUIDE_FRAMES.struck,
      width: cell.width,
      height: cell.height,
      commands: [
        bandIn(cell, cut, 0, { color: palette.guide, width: band }),
        bandIn(cell, cut, band, {
          color: palette.field,
          width: widthOf(GUIDE_STRUCK.seam, scale),
        }),
      ],
    },
  ];
}
