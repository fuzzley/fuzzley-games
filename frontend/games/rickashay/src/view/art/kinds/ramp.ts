// A ramp, which never breaks: `ramp()` in `docs/rickashay/art/make-art.mjs`,
// a wedge of steel filling half its tile's body, its right angle in the
// corner of its cell its plates name and cut across as the tile's corners
// are, its two points cut square, a bright edge along its long face and
// three rivets along its short sides. The art lays the bright edge on the
// wedge's own edge, where it keeps only about 2:1 against the light
// palettes' field; here it lies inside a rim of the steel, so the ramp's
// whole outline keeps steel's 3:1. The rivets, which the art draws in a
// darker steel, are cut out in the marks' color, as steel's are.

import { RADIUS } from "@fz/brick-wall/rules/field";
import { CEILINGWARD, RIGHT } from "@fz/brick-wall/rules/grid";
import { cellFrame, detailed } from "@fz/brick-wall/view/art";
import { itemAt } from "@fz/core/records";
import { mixColors } from "@fz/phaser/color";
import {
  type Area,
  type ArtScale,
  type DrawCommand,
  type Point,
  circle,
  polygon,
  widthOf,
} from "@fz/phaser/shapes";
import { STAND_OFF } from "../../../rules/tuning";
import type { WallPalette } from "../../colors/palette";
import type { KindArt } from "../art";
import {
  FRAMES,
  type FrameName,
  RAMP_CORNERS,
  type RampCorner,
} from "../frames";
import { CUT_TILE, tileBody } from "./brick";

const WHITE = 0xffffff;

/**
 * How long the flat that cuts each of its points square is, from its
 * tile's edge to its long face, as a share of its cell: as long as the
 * flat a flight turns off there, which the art rounds to 0.1.
 */
const TIP = STAND_OFF - RADIUS;

/** How much white its bright edge takes over its steel: the art's. */
const BRIGHT = 0.42;

/** How wide the rim of steel round its bright edge is, in field units. */
const RIM = 0.03;

/** How deep its bright edge is, square to its long face, as a share of its cell. */
const EDGE = 0.1;

/** Where its rivets sit, for a right angle in its cell's floorward left corner, as shares of its cell: across, and down. */
const RIVETS = [
  [0.18, 0.6],
  [0.18, 0.82],
  [0.4, 0.82],
] as const;

/** A rivet's radius, as a share of its cell. */
const RIVET_RADIUS = 0.04;

/** Which ways each corner's ramp is mirrored from one whose right angle sits in its cell's floorward left corner. */
const MIRRORS = {
  "floorward-left": { across: false, down: false },
  "floorward-right": { across: true, down: false },
  "ceilingward-left": { across: false, down: true },
  "ceilingward-right": { across: true, down: true },
} as const satisfies Readonly<
  Record<RampCorner, { readonly across: boolean; readonly down: boolean }>
>;

/** A ramp's layers, by the corner its right angle sits in, in `RAMP_CORNERS`' order, each made once. */
const RAMP_LAYERS: readonly (readonly FrameName[])[] = RAMP_CORNERS.map(
  (corner) => [FRAMES.ramp(corner)],
);

/**
 * Returns the place in `RAMP_CORNERS` of the corner a ramp's plates name,
 * read as its faces read them: the ceilingward side where they name it,
 * else the floorward, and the right where they name it, else the left.
 */
function cornerAt(plates: number): number {
  return (
    ((plates & CEILINGWARD) === 0 ? 0 : 2) + ((plates & RIGHT) === 0 ? 0 : 1)
  );
}

/**
 * Returns how far a point lies inside the line along an edge of an outline
 * that runs clockwise on the canvas, from one of its points to the next:
 * below nothing past it.
 */
function inside(from: Point, to: Point, point: Point): number {
  const across = to.x - from.x;
  const down = to.y - from.y;
  return (
    ((point.y - from.y) * across - (point.x - from.x) * down) /
    Math.hypot(across, down)
  );
}

/**
 * Returns the part of a convex outline where a measure of each point is
 * nothing or more, cut along the line where it is nothing.
 */
function clipped(
  outline: readonly Point[],
  measure: (point: Point) => number,
): readonly Point[] {
  return outline.flatMap((point, i) => {
    const next = itemAt(outline, (i + 1) % outline.length);
    const here = measure(point);
    const there = measure(next);
    const kept = here >= 0 ? [point] : [];
    if (here * there >= 0) return kept;
    const along = here / (here - there);
    return [
      ...kept,
      {
        x: point.x + (next.x - point.x) * along,
        y: point.y + (next.y - point.y) * along,
      },
    ];
  });
}

/** Returns a convex outline that runs clockwise on the canvas with each of its edges moved in by a length, which may leave nothing of it. */
function shrunk(outline: readonly Point[], by: number): readonly Point[] {
  return outline.reduce<readonly Point[]>(
    (kept, from, i) =>
      clipped(kept, (point) => {
        const to = itemAt(outline, (i + 1) % outline.length);
        return inside(from, to, point) - by;
      }),
    outline,
  );
}

/**
 * Returns a ramp drawn in its cell, its right angle in a corner of it: the
 * wedge of steel, its bright edge where any of it fits inside the rim, and
 * its rivets where a scale shows the finest detail.
 */
function rampCommands(
  cell: Area,
  corner: RampCorner,
  palette: WallPalette,
  scale: ArtScale,
): readonly DrawCommand[] {
  const { x, y, width, height } = tileBody(cell);
  const right = x + width;
  const foot = y + height;
  const tip = TIP * cell.width;
  const cut = CUT_TILE.cut * cell.width;
  // Clockwise from its upper point, along the flat that cuts it square,
  // down the long face, round the lower point and back by the right angle.
  const top = { x: x + tip, y };
  const bottom = { x: right, y: foot - tip };
  const wedge: readonly Point[] = [
    { x, y },
    top,
    bottom,
    { x: right, y: foot },
    { x: x + cut, y: foot },
    { x, y: foot - cut },
  ];
  const rim = widthOf(RIM, scale);
  const edge = clipped(
    shrunk(wedge, rim),
    (point) => rim + EDGE * cell.width - inside(top, bottom, point),
  );
  const mirror = MIRRORS[corner];
  const mirrored = ({ x: across, y: down }: Point): Point => ({
    x: mirror.across ? 2 * cell.x + cell.width - across : across,
    y: mirror.down ? 2 * cell.y + cell.height - down : down,
  });
  const { steel, mark } = palette;
  return [
    polygon(wedge.map(mirrored), { color: steel }),
    ...(edge.length < 3
      ? []
      : [
          polygon(edge.map(mirrored), {
            color: mixColors(WHITE, steel, BRIGHT),
          }),
        ]),
    ...(detailed(scale)
      ? RIVETS.map(([across, down]) =>
          circle(
            mirrored({
              x: cell.x + across * cell.width,
              y: cell.y + down * cell.height,
            }),
            RIVET_RADIUS * cell.width,
            { color: mark },
          ),
        )
      : []),
  ];
}

/**
 * How a ramp is drawn: one frame for each corner its right angle may sit
 * in, whatever it has met, since it takes nothing. It brings the four to
 * the atlas, its rivets drawn only at a scale that shows the finest detail.
 */
export const RAMP_ART = {
  layersOf: ({ plates }) => itemAt(RAMP_LAYERS, cornerAt(plates)),
  frames: (palette, scale) =>
    RAMP_CORNERS.map((corner) =>
      cellFrame(FRAMES.ramp(corner), scale, (cell) =>
        rampCommands(cell, corner, palette, scale),
      ),
    ),
} as const satisfies KindArt;
