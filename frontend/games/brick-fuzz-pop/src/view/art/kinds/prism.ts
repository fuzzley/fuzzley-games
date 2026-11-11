// A prism, which splits a fuzzball in three: a pale tile of glass, a
// faceted triangle on it, and three rays leaving it, each in a tint of its
// own, `prism()` in `docs/archive/brick-fuzz-pop/art/make-art.mjs`.

import { mixColors } from "@fz/phaser/color";
import {
  type Area,
  type ArtScale,
  type DrawCommand,
  type LineStyle,
  type Point,
  circle,
  inset,
  line,
  outlineRoundRect,
  polygon,
  roundRect,
  stroke,
  widthOf,
  within,
} from "@fz/phaser/shapes";
import type { WallPalette } from "../../colors/palette";
import type { KindArt } from "../art";
import { FRAMES } from "../frames";
import { itemAt } from "../../items";
import { cellFrame, pointAt, turned } from "../symbols";
import { tileBody, tileRadius } from "./brick";

/** How wide its glass's outline is, in field units, inside the chunky tile's edge, which its glass's is. */
const GLASS_EDGE = 0.03;

/** Its rays: the point they leave from, and how far from it each starts and ends, as shares of its cell, and how wide each is, in field units. */
const RAYS = {
  across: 0.5,
  down: 0.41,
  from: 0.11,
  to: 0.27,
  width: 0.054,
} as const;

/** The way each of its rays leaves, in degrees clockwise from its cell's right, from the left: each drawn in the palette's ray of its place. */
const RAY_TURNS = [-142, -90, -38] as const;

/** Its triangle's corners, its top, then its bottom left and right, as shares of its cell. */
const TRIANGLE = [
  [0.5, 0.37],
  [0.24, 0.82],
  [0.76, 0.82],
] as const;

/** How wide its triangle's outline is, in field units. */
const TRIANGLE_EDGE = 0.04;

/** How much of its glyph's color its triangle takes over the field. */
const TRIANGLE_WASH = 0.3;

/**
 * Where its facets meet, inside its triangle, as shares of its cell, and
 * how wide each line from there to a corner is, in field units: round
 * where they meet, and at the corners under its outline's.
 */
const FACETS = { across: 0.5, down: 0.67, width: 0.026 } as const;

/** Returns a closed outline through corners: a line along each side, and a dot as wide at each corner, so its joins are round. */
function outlineThrough(
  corners: readonly Point[],
  style: LineStyle,
): readonly DrawCommand[] {
  return [
    ...corners.map((from, i) =>
      line(from, itemAt(corners, (i + 1) % corners.length), style),
    ),
    ...corners.map((corner) => circle(corner, style.width / 2, style)),
  ];
}

/**
 * Returns a prism drawn in its cell: its glass, the chunky tile's shape, in
 * its face's color, outlined inside its edge in its body's; its rays, each
 * in the palette's ray of its place, round at their ends; and its triangle,
 * filled in its glyph's color washed over the field, outlined in its
 * glyph's, and faceted by a line from inside it to each corner.
 */
function prismCommands(
  cell: Area,
  palette: WallPalette,
  scale: ArtScale,
): readonly DrawCommand[] {
  const { body, face, glyph } = palette.kinds.prism;
  const edge = widthOf(GLASS_EDGE, scale);
  // The outline's middle lies half its width in from the tile's edge, so
  // its outer edge is the tile's, on whole pixels as the tile's is.
  const glass = inset(tileBody(cell), edge / 2);
  const round = tileRadius(cell) - edge / 2;
  const leaving = pointAt(cell, RAYS.across, RAYS.down);
  const triangle = within(cell, TRIANGLE);
  const facets = { color: glyph, width: widthOf(FACETS.width, scale) };
  const meeting = pointAt(cell, FACETS.across, FACETS.down);
  return [
    roundRect(glass, round, { color: face }),
    outlineRoundRect(glass, round, { color: body, width: edge }),
    ...palette.rays.flatMap((color, i) =>
      stroke(
        [RAYS.from, RAYS.to].map((reach) => {
          const way = turned(
            { x: reach * cell.width, y: 0 },
            itemAt(RAY_TURNS, i),
          );
          return { x: leaving.x + way.x, y: leaving.y + way.y };
        }),
        { color, width: widthOf(RAYS.width, scale) },
      ),
    ),
    polygon(triangle, {
      color: mixColors(glyph, palette.field, TRIANGLE_WASH),
    }),
    ...outlineThrough(triangle, {
      color: glyph,
      width: widthOf(TRIANGLE_EDGE, scale),
    }),
    ...triangle.map((corner) => line(meeting, corner, facets)),
    circle(meeting, facets.width / 2, facets),
  ];
}

/** A prism's layers, made once. */
const PRISM_LAYERS = [FRAMES.prism] as const;

/** How a prism is drawn: one frame, as it breaks at its first hit. */
export const PRISM_ART: KindArt = {
  layersOf: () => PRISM_LAYERS,
  frames: (palette, scale) => [
    cellFrame(FRAMES.prism, scale, (cell) =>
      prismCommands(cell, palette, scale),
    ),
  ],
};
