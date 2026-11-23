// A steel brick, which never breaks: `steel()` in
// `docs/rickashay/art/make-art.mjs`, its tile in steel under a bevelled
// frame, its corners cut as the tile's are, a rivet in each of the frame's
// corners and two strokes of sheen, `@fz/phaser/bricks`' `sheen()`. The art
// draws the frame and the rivets in a darker steel, which keeps only about
// 2:1 against the steel; here they are cut out in the marks' color, the
// field's, as Brick Fuzz Pop's are, which keeps 3:1 against it.

import { rivets, sheen } from "@fz/phaser/bricks";
import {
  type Area,
  type ArtScale,
  type DrawCommand,
  type LineStyle,
  type Point,
  type PolygonCommand,
  crispEdge,
  inset,
  polygon,
  share,
  widthOf,
} from "@fz/phaser/shapes";
import type { WallPalette } from "../../colors/palette";
import type { KindArt } from "../art";
import { cellFrame, detailed } from "../cells";
import { FRAMES } from "../frames";
import { tileCommands } from "./brick";

/** Where its bevelled frame's line runs in its cell, as shares of it: from across and down, wide and tall, the art's. */
const BEVEL = [0.145, 0.14, 0.71, 0.655] as const;

/** How far along each side from each corner of its frame the cut across that corner reaches, as a share of its cell. */
const BEVEL_CUT = 0.07;

/** How wide its frame's line is, in field units. */
const BEVEL_WIDTH = 0.034;

/** Where its rivets sit, one in each corner of its frame, as shares of its cell: across, and down. */
const RIVETS = { across: [0.27, 0.73], down: [0.26, 0.68] } as const;

/** A rivet's radius, as a share of its cell. */
const RIVET_RADIUS = 0.04;

/**
 * How much further along each side a cut across a corner at 45° reaches
 * for each length its edges move out: moved out square to itself as far as
 * the sides are, it meets them √2 further from the corner, which moved out
 * as far along each.
 */
const CUT_GROWTH = 2 - Math.SQRT2;

/** A steel brick's layers, made once. */
const STEEL_LAYERS = [FRAMES.steel] as const;

/** Returns the points round a rectangle with each corner cut across at 45°, a cut's length along each side from it, clockwise from the top of its left side. */
function cutCorners(area: Area, cut: number): readonly Point[] {
  const right = area.x + area.width;
  const bottom = area.y + area.height;
  return [
    { x: area.x, y: area.y + cut },
    { x: area.x + cut, y: area.y },
    { x: right - cut, y: area.y },
    { x: right, y: area.y + cut },
    { x: right, y: bottom - cut },
    { x: right - cut, y: bottom },
    { x: area.x + cut, y: bottom },
    { x: area.x, y: bottom - cut },
  ];
}

/** Returns points back to where they started. */
function closed(points: readonly Point[]): readonly Point[] {
  return [...points, ...points.slice(0, 1)];
}

/**
 * Returns the outline of a rectangle with its corners cut across at 45°, a
 * line a whole number of device pixels wide about its edge, drawn as a
 * band, as `@fz/phaser/shapes`' `crispOutline()` draws a rounded one: about
 * its `crispEdge()`, so the band's straight edges lie on whole pixels, one
 * polygon round its outer edge and back round its inner, which leaves the
 * hole it rings empty. A line as wide as the edge's shorter side, or wider,
 * leaves no hole, so it fills what its outer edge rings instead.
 */
function cutOutline(area: Area, cut: number, style: LineStyle): PolygonCommand {
  const edge = crispEdge(area, style.width);
  const half = style.width / 2;
  const outside = cutCorners(inset(edge, -half), cut + half * CUT_GROWTH);
  if (style.width >= Math.min(edge.width, edge.height)) {
    return polygon(outside, style);
  }
  const inside = cutCorners(
    inset(edge, half),
    Math.max(0, cut - half * CUT_GROWTH),
  );
  return polygon([...closed(outside), ...[...closed(inside)].reverse()], style);
}

/** Returns a steel brick drawn in its cell: a tile of steel, its bevelled frame, a rivet in each of the frame's corners where a scale shows the finest detail, and the sheen. */
function steelCommands(
  cell: Area,
  palette: WallPalette,
  scale: ArtScale,
): readonly DrawCommand[] {
  const { steel, mark } = palette;
  return [
    ...tileCommands(cell, steel),
    cutOutline(share(cell, ...BEVEL), BEVEL_CUT * cell.width, {
      color: mark,
      width: widthOf(BEVEL_WIDTH, scale),
    }),
    ...(detailed(scale)
      ? rivets(cell, RIVETS.across, RIVETS.down, RIVET_RADIUS * cell.width, {
          color: mark,
        })
      : []),
    ...sheen(cell, steel, scale.pixelRatio),
  ];
}

/** How a steel brick is drawn: one frame, whatever it has met, since it takes nothing. */
export const STEEL_ART = {
  layersOf: (_) => STEEL_LAYERS,
  frames: (palette, scale) => [
    cellFrame(FRAMES.steel, scale, (cell) =>
      steelCommands(cell, palette, scale),
    ),
  ],
} as const satisfies KindArt;
