// A plated brick: a tough brick in orange with a steel plate over each face it
// armors, a bar standing on a gap of the field, with two rivets and a row of
// teeth pointing out, and its pips moved to the middle of what the plates leave
// showing, `plated()` and `plate()` in
// `docs/archive/brick-fuzz-pop/art/make-art.mjs`. A brick stacks one frame of
// its plates and pips, for its plating and its hits left, over the orange tile.
// A plate's gap stays on the tile, round its corners, where the art's runs to
// the cell's edges, so the grid's dots and the flourishes under the wall show
// past it; its steel stands out of the tile, as the art's does.

import {
  type Area,
  type ArtScale,
  type DrawCommand,
  type Point,
  arcPoints,
  circle,
  polygon,
  roundRect,
} from "@fz/phaser/shapes";
import { CEILINGWARD, FLOORWARD, LEFT, RIGHT } from "../../../rules/grid";
import { TINT } from "../../colors/inks";
import type { WallPalette } from "../../colors/palette";
import type { KindArt } from "../art";
import {
  FRAMES,
  type FrameName,
  PLATED_HITS,
  PLATINGS,
  type Plating,
} from "../frames";
import { itemAt } from "../../items";
import { cellFrame, detailed, diePips, pointAt } from "../symbols";
import { tileBody, tileFrame, tileRadius } from "./brick";

/** The tint of the tile under a plated brick's plates, which is its body in every palette. */
export const PLATED_TINT = TINT.orange;

/** Names a face a plate covers, by the quarter turns its plate is drawn turned from the one toward the floor, clockwise. */
type Face = "floorward" | "left" | "ceilingward" | "right";

/** How many quarter turns clockwise each face's plate is drawn from the floorward one's, at the cell's bottom. */
const TURNS: Readonly<Record<Face, number>> = {
  floorward: 0,
  left: 1,
  ceilingward: 2,
  right: 3,
};

/**
 * Describes how a plating is drawn: the faces it plates, as a brick's
 * `plates` holds them; its plates, in the order drawn; and its pips,
 * where the plates leave them room, their middle, how far apart they are
 * and how large each is, as shares of the cell.
 */
interface PlatingArt {
  readonly faces: number;
  readonly plates: readonly Face[];
  readonly pips: {
    readonly across: number;
    readonly down: number;
    readonly step: number;
    readonly radius: number;
  };
}

/** How each plating is drawn: the sides' plates before the floorward one, which lies over their ends. */
const PLATING_ART: Readonly<Record<Plating, PlatingArt>> = {
  floorward: {
    faces: FLOORWARD,
    plates: ["floorward"],
    pips: { across: 0.5, down: 0.415, step: 0.19, radius: 0.066 },
  },
  "floorward-sides": {
    faces: FLOORWARD | LEFT | RIGHT,
    plates: ["left", "right", "floorward"],
    pips: { across: 0.5, down: 0.415, step: 0.145, radius: 0.06 },
  },
  ceilingward: {
    faces: CEILINGWARD,
    plates: ["ceilingward"],
    pips: { across: 0.5, down: 0.57, step: 0.19, radius: 0.066 },
  },
};

/**
 * A plate toward the floor, as shares of its cell up from its bottom edge:
 * how deep its gap reaches into the tile; how far in from the cell's sides
 * its bar's ends lie, and where its edges lie, from and to; and how round
 * its corners are.
 */
const BAR = {
  gap: 0.265,
  inset: 0.02,
  from: 0.09,
  to: 0.23,
  corner: 0.04,
} as const;

/**
 * Its teeth, pointing out of its bar: how many, and how many under 30 CSS
 * pixels a unit, where half as many show; across what of the cell, from and
 * to; how far apart each is from the next; and where each stands in its bar
 * and where it points to, up from the cell's bottom, as shares of the cell.
 */
const TEETH = {
  count: 6,
  fewer: 3,
  from: 0.09,
  to: 0.91,
  gap: 0.012,
  base: 0.1,
  tip: 0.006,
} as const;

/** Its two rivets, across its cell and up from its bottom, and their radius, as shares of the cell. */
const RIVETS = { across: [0.14, 0.86], up: 0.16, radius: 0.032 } as const;

/** Returns a point of a square cell turned a number of quarter turns clockwise about its middle. */
function turnedIn(cell: Area, { x, y }: Point, turns: number): Point {
  let across = x - cell.x;
  let down = y - cell.y;
  for (let turn = 0; turn < turns; turn++) {
    [across, down] = [cell.width - down, across];
  }
  return { x: cell.x + across, y: cell.y + down };
}

/** Returns an area of a square cell turned a number of quarter turns clockwise about its middle. */
function turnedAreaIn(cell: Area, area: Area, turns: number): Area {
  const from = turnedIn(cell, area, turns);
  const to = turnedIn(
    cell,
    { x: area.x + area.width, y: area.y + area.height },
    turns,
  );
  return {
    x: Math.min(from.x, to.x),
    y: Math.min(from.y, to.y),
    width: Math.abs(to.x - from.x),
    height: Math.abs(to.y - from.y),
  };
}

/** Returns how far down its cell a plate toward the floor reaches into the tile, its gap's inner edge, on a whole pixel. */
function gapEdge(cell: Area): number {
  return cell.y + cell.width - Math.round(BAR.gap * cell.width);
}

/**
 * Returns the outline of a tile's body with rounded corners, a radius
 * round, clockwise from the left end of its top left corner, each corner
 * drawn as points round it.
 */
function outlineOf(body: Area, corner: number): readonly Point[] {
  const left = body.x + corner;
  const right = body.x + body.width - corner;
  const top = body.y + corner;
  const foot = body.y + body.height - corner;
  return [
    ...arcPoints({ x: left, y: top }, corner, Math.PI, 1.5 * Math.PI),
    ...arcPoints({ x: right, y: top }, corner, 1.5 * Math.PI, 2 * Math.PI),
    ...arcPoints({ x: right, y: foot }, corner, 0, 0.5 * Math.PI),
    ...arcPoints({ x: left, y: foot }, corner, 0.5 * Math.PI, Math.PI),
  ];
}

/**
 * Returns the part of a convex polygon on one side of a line across it,
 * above it or below: its points on that side or on the line, and those
 * where its sides cross the line, none where it lies wholly on the other.
 */
function cutAt(
  points: readonly Point[],
  line: number,
  keep: "above" | "below",
): readonly Point[] {
  const kept = (y: number) => (keep === "above" ? y <= line : y >= line);
  return points.flatMap((point, i) => {
    const next = itemAt(points, (i + 1) % points.length);
    const crossing =
      (point.y - line) * (next.y - line) < 0
        ? [
            {
              x:
                point.x +
                ((line - point.y) / (next.y - point.y)) * (next.x - point.x),
              y: line,
            },
          ]
        : [];
    return [...(kept(point.y) ? [point] : []), ...crossing];
  });
}

/**
 * Returns a plate drawn over a face of a brick in its cell: its gap, in its
 * face's color, the tile's rounded square past the plate's inner edge,
 * where a cell leaves any; its bar, in its glyph's, on whole pixels, a
 * pixel of the gap over it at least; its teeth, standing in the bar, half
 * as many where a scale isn't detailed; and its rivets, cut out of the bar
 * in its face's color, where it is.
 *
 * It reaches no further down the cell than a reach, where a plate drawn
 * over it later starts its gap: its teeth are cut there and its rivets past
 * it left out, and its bar runs on under that gap by its corners' radius,
 * so the gap cuts it square.
 */
function plateCommands(
  cell: Area,
  face: Face,
  reach: number,
  palette: WallPalette,
  scale: ArtScale,
): readonly DrawCommand[] {
  const { face: gap, glyph } = palette.kinds.plated;
  const turns = TURNS[face];
  const side = cell.width;
  const bottom = cell.y + side;
  const inner = gapEdge(cell);
  const inset = Math.round(BAR.inset * side);
  const barFoot = bottom - Math.round(BAR.from * side);
  const barTop = Math.min(
    barFoot,
    Math.max(inner + 1, bottom - Math.round(BAR.to * side)),
  );
  const toothFoot = barFoot - (TEETH.base - BAR.from) * side;
  const teeth = detailed(scale) ? TEETH.count : TEETH.fewer;
  const pitch = ((TEETH.to - TEETH.from) * side) / teeth;
  const point = (shape: Point) => turnedIn(cell, shape, turns);
  const gapPoints = cutAt(
    outlineOf(tileBody(cell), tileRadius(cell)),
    inner,
    "below",
  ).map(point);
  const bar = turnedAreaIn(
    cell,
    {
      x: cell.x + inset,
      y: barTop,
      width: side - 2 * inset,
      height: barFoot - barTop,
    },
    turns,
  );
  return [
    ...(gapPoints.length >= 3 ? [polygon(gapPoints, { color: gap })] : []),
    roundRect(
      {
        ...bar,
        height: Math.min(bar.y + bar.height, reach + BAR.corner * side) - bar.y,
      },
      BAR.corner * side,
      { color: glyph },
    ),
    ...Array.from({ length: teeth }, (_, i) => {
      const left = cell.x + TEETH.from * side + pitch * i + TEETH.gap * side;
      const right =
        cell.x + TEETH.from * side + pitch * (i + 1) - TEETH.gap * side;
      return cutAt(
        [
          { x: left, y: toothFoot },
          { x: (left + right) / 2, y: bottom - TEETH.tip * side },
          { x: right, y: toothFoot },
        ].map(point),
        reach,
        "above",
      );
    })
      .filter((tooth) => tooth.length >= 3)
      .map((tooth) => polygon(tooth, { color: glyph })),
    ...(detailed(scale)
      ? RIVETS.across
          .map((across) =>
            point({ x: cell.x + across * side, y: bottom - RIVETS.up * side }),
          )
          .filter(({ y }) => y <= reach)
          .map((middle) => circle(middle, RIVETS.radius * side, { color: gap }))
      : []),
  ];
}

/**
 * Returns a plated brick's plates and pips drawn in its cell for a plating
 * and its hits left: its pips cut out in the marks' color while it has two
 * hits left or more, then each plate, a side's reaching only to the
 * floorward plate's gap, which is drawn over its end.
 */
function platedCommands(
  cell: Area,
  plating: Plating,
  hits: number,
  palette: WallPalette,
  scale: ArtScale,
): readonly DrawCommand[] {
  const { plates, pips } = PLATING_ART[plating];
  const bottom = cell.y + cell.width;
  const reach = plates.includes("floorward") ? gapEdge(cell) : bottom;
  return [
    ...(hits > 1
      ? diePips(
          hits,
          pointAt(cell, pips.across, pips.down),
          pips.step * cell.width,
          pips.radius * cell.width,
          { color: palette.mark },
        )
      : []),
    ...plates.flatMap((face) =>
      plateCommands(
        cell,
        face,
        face === "floorward" ? bottom : reach,
        palette,
        scale,
      ),
    ),
  ];
}

/** Each plating's faces, in the order of {@link PLATINGS}. */
const FACES: readonly number[] = PLATINGS.map(
  (plating) => PLATING_ART[plating].faces,
);

/** A plated brick's layers, by its plating, then its hits left from 1: the orange tile, under its plates and pips. Made once, so finding a brick's makes nothing. */
const PLATED_LAYERS: readonly (readonly (readonly FrameName[])[])[] =
  PLATINGS.map((plating) =>
    PLATED_HITS.map((hits) => [
      tileFrame(PLATED_TINT),
      FRAMES.plated(plating, hits),
    ]),
  );

/**
 * How a plated brick is drawn: the orange tile, under a frame of its plates
 * and its pips for its plating and its hits left. It shows no cracks, as
 * the shell and moss show none.
 *
 * It finds no layers for faces no level plates, or for more hits left than
 * 3, throwing a `RangeError`.
 */
export const PLATED_ART: KindArt = {
  layersOf: ({ plates, hits }) =>
    itemAt(itemAt(PLATED_LAYERS, FACES.indexOf(plates)), hits - 1),
  frames: (palette, scale) =>
    PLATINGS.flatMap((plating) =>
      PLATED_HITS.map((hits) =>
        cellFrame(FRAMES.plated(plating, hits), scale, (cell) =>
          platedCommands(cell, plating, hits, palette, scale),
        ),
      ),
    ),
};
