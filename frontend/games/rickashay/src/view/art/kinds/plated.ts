// A plated brick: a tough brick on the orange tile with a steel plate over
// each face it is plated on, a bar standing on a gap of the field, with two
// rivets and a row of teeth pointing out, and its pips moved to the middle
// of what the plates leave showing, `plated()` in
// `docs/rickashay/art/make-art.mjs`, after Brick Fuzz Pop's `plate()`. A
// brick stacks one frame of its plates and pips, for its plating and its
// hits left, over the orange tile.
//
// Every plate keeps inside the tile's body, where the art's runs to its
// cell's edges, as every brick's marks do here: its gap is the body past
// the plate's inner edge, cut across the body's corners, and its teeth
// point out of the flat of its face between those cuts, which are bare
// unless the face beside is plated too.

import { FLOORWARD, LEFT, RIGHT } from "@fz/brick-wall/rules/grid";
import { TINT } from "@fz/brick-wall/view/inks";
import { bodyOutline, plateTeeth } from "@fz/phaser/bricks";
import {
  type Area,
  type ArtScale,
  type DrawCommand,
  type Point,
  circle,
  diePips,
  pointAt,
  polygon,
  roundRect,
} from "@fz/phaser/shapes";
import type { WallPalette } from "../../colors/palette";
import type { KindArt } from "../art";
import { cellFrame, detailed } from "../cells";
import {
  FRAMES,
  type FrameName,
  PLATED_HITS,
  PLATINGS,
  type Plating,
} from "../frames";
import { itemAt } from "../items";
import { CUT_TILE, tileBody } from "./brick";

/** Names a face a plate covers, by the quarter turns its plate is drawn turned from the one toward the floor, clockwise. */
type Face = "floorward" | "left" | "right";

/** How many quarter turns clockwise each face's plate is drawn from the floorward one's, at the cell's bottom. */
const TURNS: Readonly<Record<Face, number>> = {
  floorward: 0,
  left: 1,
  right: 3,
};

/**
 * Describes how a plating is drawn: the faces it plates, as a brick's
 * `plates` holds them; its plates, in the order drawn; and its pips,
 * where the plates leave them room, their middle, how far apart they are
 * and how large each is, as shares of the cell, the art's.
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
const PLATING_ART = {
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
} as const satisfies Readonly<Record<Plating, PlatingArt>>;

/**
 * A plate toward the floor, as shares of its cell: how deep its gap reaches
 * into the tile, up from the cell's bottom; where its bar's edges lie, to
 * and from, up from the foot of the tile's body, its ends as near the
 * body's sides as the cuts across its corners let them; and how round its
 * corners are.
 */
const BAR = {
  gap: 0.265,
  to: 0.195,
  from: 0.095,
  corner: 0.03,
} as const;

/**
 * Its teeth, pointing out of its bar across the flat of its face between
 * the body's cut corners: how many, and how many under 30 CSS pixels a
 * unit, where half as many show; how far each is cut back from its share of
 * the span on each side; and how far up their feet stand from the bar's
 * foot, in the bar, and their tips from the body's foot, inside it, as
 * shares of the cell.
 */
const TEETH = {
  count: 6,
  fewer: 3,
  gap: 0.012,
  foot: 0.01,
  tip: 0.01,
} as const;

/** Its two rivets, across its cell, in the middle of its bar, and their radius, as shares of the cell. */
const RIVETS = { across: [0.16, 0.84], radius: 0.03 } as const;

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
 * Returns the part of a convex polygon on one side of a line across it,
 * above it or below: its points on that side or on the line, and those
 * where its sides cross the line, none where it lies wholly on the other.
 */
function cutAt(
  points: readonly Point[],
  line: number,
  keep: "above" | "below",
): readonly Point[] {
  const kept = (y: number): boolean =>
    keep === "above" ? y <= line : y >= line;
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
 * Returns a plate drawn over a face of a brick in its cell: its gap, in the
 * field's color, the tile's body past the plate's inner edge; its bar, in
 * steel, on whole pixels, a pixel of the gap over it at least; its teeth,
 * standing in the bar, half as many where a scale isn't detailed; and its
 * rivets, cut out of the bar in the marks' color, where it is.
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
  const { field, steel, mark } = palette;
  const turns = TURNS[face];
  const side = cell.width;
  const body = tileBody(cell);
  const cut = CUT_TILE.cut * side;
  const foot = body.y + body.height;
  const inner = gapEdge(cell);
  const barFoot = foot - Math.round(BAR.from * side);
  const barTop = Math.min(
    barFoot,
    Math.max(inner + 1, foot - Math.round(BAR.to * side)),
  );
  // Its bar's bottom corners keep on the body's side of the cuts across its
  // corners, which reach as far in from its sides as they rise past its
  // foot.
  const inset = Math.max(0, Math.ceil(cut - (foot - barFoot)));
  const point = (shape: Point): Point => turnedIn(cell, shape, turns);
  const gap = cutAt(bodyOutline(cell, CUT_TILE), inner, "below").map(point);
  const bar = turnedAreaIn(
    cell,
    {
      x: body.x + inset,
      y: barTop,
      width: body.width - 2 * inset,
      height: barFoot - barTop,
    },
    turns,
  );
  return [
    ...(gap.length >= 3 ? [polygon(gap, { color: field })] : []),
    roundRect(
      {
        ...bar,
        height: Math.min(bar.y + bar.height, reach + BAR.corner * side) - bar.y,
      },
      BAR.corner * side,
      { color: steel },
    ),
    ...plateTeeth({
      from: body.x + cut,
      span: body.width - 2 * cut,
      count: detailed(scale) ? TEETH.count : TEETH.fewer,
      gap: TEETH.gap * side,
      foot: barFoot - TEETH.foot * side,
      tip: foot - TEETH.tip * side,
    })
      .map((tooth) => cutAt(tooth.map(point), reach, "above"))
      .filter((tooth) => tooth.length >= 3)
      .map((tooth) => polygon(tooth, { color: steel })),
    ...(detailed(scale)
      ? RIVETS.across
          .map((across) =>
            point({ x: cell.x + across * side, y: (barTop + barFoot) / 2 }),
          )
          .filter(({ y }) => y <= reach)
          .map((middle) =>
            circle(middle, RIVETS.radius * side, { color: mark }),
          )
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
  const reach = gapEdge(cell);
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
      FRAMES.tile(TINT.orange),
      FRAMES.plated(plating, hits),
    ]),
  );

/**
 * How a plated brick is drawn: the orange tile, under a frame of its plates
 * and its pips for its plating and its hits left. It shows no cracks, as
 * the design's art shows none on it.
 *
 * It finds no layers for faces no level plates, or for more hits left than
 * 3, throwing a `RangeError`.
 */
export const PLATED_ART = {
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
} as const satisfies KindArt;
