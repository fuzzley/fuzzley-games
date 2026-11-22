// The slab a brick game's brick stands on: its body, a darker lip along its
// foot and a lighter strip along its top, three flat shapes, every length a
// share of its cell's short side, so a square tile and a brick twice as wide
// as tall are laid out by the same code, and differ only in their shares, as
// a slab with round corners and one with its corners cut at 45° do.

import { mixColors } from "../color";
import {
  type Area,
  type ArtScale,
  type DrawCommand,
  type FillStyle,
  type Point,
  arcPoints,
  inset,
  polygon,
  roundRect,
} from "../shapes";

/** Says how a slab lies in its cell and how it is shaded, each length a share of the cell's short side. */
export interface SlabShares {
  /** How far in from its cell its body lies on each side. */
  readonly gap: number;
  /** How round its body's corners are. */
  readonly corner: number;
  /** How far along each side from a corner of its body the 45° cut across that corner reaches: nothing where its corners are only round. */
  readonly cut: number;
  /** How tall the lighter strip along its top is. */
  readonly strip: number;
  /** How tall the darker lip along its foot is. */
  readonly lip: number;
  /** How much black its lip takes over its ink. */
  readonly lipShade: number;
  /** How much white its strip takes over its ink. */
  readonly stripLight: number;
}

/** Brick Fuzz Pop's square tile. */
export const TILE_SLAB: SlabShares = {
  gap: 0.04,
  corner: 0.14,
  cut: 0,
  strip: 0.05,
  lip: 0.07,
  lipShade: 0.22,
  stripLight: 0.22,
};

/** Brick Breaker's brick, two units wide and one tall: rounder than the tile, with a deeper strip and lip, and its lip a little darker. */
export const BRICK_SLAB: SlabShares = {
  gap: 0.04,
  corner: 0.16,
  cut: 0,
  strip: 0.07,
  lip: 0.09,
  lipShade: 0.24,
  stripLight: 0.22,
};

/** How many CSS pixels wide a brick is, at least, where it shows its finest detail. */
const DETAIL_CSS_PX = 30;

const WHITE = 0xffffff;
const BLACK = 0x000000;

/** A quarter of a turn, in radians. */
const QUARTER = Math.PI / 2;

/**
 * Returns whether a brick so many field units wide is drawn wide enough at
 * a scale for its finest detail, such as its cracks, rivets and sheen:
 * {@link DETAIL_CSS_PX} CSS pixels or more.
 */
export function showsDetail(scale: ArtScale, unitsWide: number): boolean {
  return (scale.unit * unitsWide) / scale.pixelRatio >= DETAIL_CSS_PX;
}

/**
 * Returns a slab's body in its cell: a whole number of device pixels in from
 * it on each side, one at least, but a pixel across its short side at least
 * too, so a cell of a pixel or two, as a canvas has before it is laid out,
 * keeps one, and none in from a cell narrower than a pixel.
 */
export function slabBody(cell: Area, shares: SlabShares): Area {
  const side = shortSide(cell);
  const gap = Math.max(1, Math.round(side * shares.gap));
  return inset(cell, Math.max(0, Math.min(gap, Math.floor((side - 1) / 2))));
}

/** Returns a slab's face in its cell: its body above the lip along its foot, the lip a whole number of device pixels tall, which a mark laid down to the lip reaches. */
export function slabFace(cell: Area, shares: SlabShares): Area {
  const body = slabBody(cell, shares);
  return { ...body, height: body.height - lipOf(cell, shares) };
}

/** Returns how round a slab's corners are in its cell, in device pixels, which a mark laid over the slab follows. */
export function slabRadius(cell: Area, shares: SlabShares): number {
  return shortSide(cell) * shares.corner;
}

/**
 * Returns the outline of a slab's body in its cell, clockwise from the top
 * of its left side, each corner round and cut across as its shares say, an
 * arc as points round it: what a mark that follows the body's edge, such as
 * a plate's gap, is cut from.
 */
export function bodyOutline(cell: Area, shares: SlabShares): readonly Point[] {
  return outlineOf(
    slabBody(cell, shares),
    slabRadius(cell, shares),
    cutOf(cell, shares),
  );
}

/**
 * Returns a slab in its cell, in an ink: a darker lip along its foot, its
 * body, and a lighter strip along its top, round and cut across its corners
 * as its shares say, three flat shapes, the lip's and the strip's straight
 * edges on whole device pixels.
 */
export function slabCommands(
  cell: Area,
  ink: number,
  shares: SlabShares,
): readonly DrawCommand[] {
  const side = shortSide(cell);
  const body = slabBody(cell, shares);
  const face = slabFace(cell, shares);
  const radius = slabRadius(cell, shares);
  const cut = cutOf(cell, shares);
  return [
    filledBody({ ...face, y: face.y + lipOf(cell, shares) }, radius, cut, {
      color: mixColors(BLACK, ink, shares.lipShade),
    }),
    filledBody(face, radius, cut, { color: ink }),
    polygon(topStrip(body, radius, cut, Math.round(side * shares.strip)), {
      color: mixColors(WHITE, ink, shares.stripLight),
    }),
  ];
}

/**
 * Returns the points of what covers a slab's body in its cell from its top
 * down to a foot, round and cut across its top corners as its shares say,
 * from the foot at its left edge to the foot at its right: what a cap of
 * moss is cut from.
 */
export function topCap(
  cell: Area,
  shares: SlabShares,
  foot: number,
): readonly Point[] {
  const body = slabBody(cell, shares);
  return [
    { x: body.x, y: foot },
    ...topEdge(body, slabRadius(cell, shares), cutOf(cell, shares)),
    { x: body.x + body.width, y: foot },
  ];
}

/**
 * Returns a body filled in a style: a rounded rectangle where no corner is
 * cut, which a canvas draws round, or else the polygon round its edge.
 */
function filledBody(
  area: Area,
  radius: number,
  cut: number,
  style: FillStyle,
): DrawCommand {
  return cut === 0
    ? roundRect(area, radius, style)
    : polygon(outlineOf(area, radius, cut), style);
}

/** Returns the points round a body's edge, clockwise from the top of its left side, each corner a radius round and cut across a cut's length. */
function outlineOf(area: Area, radius: number, cut: number): readonly Point[] {
  const { left, right } = topCorners(area, radius);
  const foot = area.y + area.height - radius;
  return [
    ...topEdge(area, radius, cut),
    ...cornerPoints({ ...right, y: foot }, 0, 1, radius, cut),
    ...cornerPoints({ ...left, y: foot }, 1, 2, radius, cut),
  ];
}

/** Returns the points of the strip along a body's top edge, round and cut across its corners, a strip's height deep. */
function topStrip(
  body: Area,
  radius: number,
  cut: number,
  strip: number,
): readonly Point[] {
  const { left, right } = topCorners(body, radius);
  return [
    ...topEdge(body, radius, cut),
    ...cornerPoints({ ...right, y: right.y + strip }, 4, 3, radius, cut),
    ...cornerPoints({ ...left, y: left.y + strip }, 3, 2, radius, cut),
  ];
}

/** Returns the points round a body's two top corners, from the top of its left side to the top of its right. */
function topEdge(body: Area, radius: number, cut: number): readonly Point[] {
  const { left, right } = topCorners(body, radius);
  return [
    ...cornerPoints(left, 2, 3, radius, cut),
    ...cornerPoints(right, 3, 4, radius, cut),
  ];
}

/**
 * Returns the points round a corner of a body, from one of its sides to the
 * other: its arc, a radius round about a middle, from a number of quarter
 * turns clockwise from the right to another, cut across at 45° where the arc
 * comes nearer the corner than a cut reaches along each side from it. A cut
 * as long as the radius or longer leaves none of the arc, only the cut's two
 * ends.
 */
function cornerPoints(
  middle: Point,
  from: number,
  to: number,
  radius: number,
  cut: number,
): readonly Point[] {
  const first = quarterWay(from);
  const last = quarterWay(to);
  const corner = {
    x: middle.x + radius * (first.x + last.x),
    y: middle.y + radius * (first.y + last.y),
  };
  if (cut >= radius) {
    return [
      { x: corner.x - cut * last.x, y: corner.y - cut * last.y },
      { x: corner.x - cut * first.x, y: corner.y - cut * first.y },
    ];
  }
  // How much further in than the cut a point lies, along both sides at once.
  const pastCut = ({ x, y }: Point): number =>
    (corner.x - x) * (first.x + last.x) +
    (corner.y - y) * (first.y + last.y) -
    cut;
  const arc = arcPoints(middle, radius, from * QUARTER, to * QUARTER);
  return arc.flatMap((point, i) => {
    const next = arc[i + 1];
    const kept = pastCut(point) >= 0 ? [point] : [];
    if (!next || pastCut(point) * pastCut(next) >= 0) return kept;
    const along = pastCut(point) / (pastCut(point) - pastCut(next));
    return [
      ...kept,
      {
        x: point.x + (next.x - point.x) * along,
        y: point.y + (next.y - point.y) * along,
      },
    ];
  });
}

/** Returns the middles a body's top corners are rounded about, a radius in from its sides and its top. */
function topCorners(
  body: Area,
  radius: number,
): { readonly left: Point; readonly right: Point } {
  return {
    left: { x: body.x + radius, y: body.y + radius },
    right: { x: body.x + body.width - radius, y: body.y + radius },
  };
}

/** Returns the way a whole number of quarter turns clockwise from the right points, a unit long: out of a body across the side an arc ends on there. */
function quarterWay(quarters: number): Point {
  const angle = quarters * QUARTER;
  // A quarter turn's cosine or sine comes out a hair off nothing, so each is
  // rounded, and `+ 0` makes a -0 of it nothing.
  return {
    x: Math.round(Math.cos(angle)) + 0,
    y: Math.round(Math.sin(angle)) + 0,
  };
}

/** Returns how far along each side from a corner of a slab's body in its cell the cut across it reaches, in device pixels. */
function cutOf(cell: Area, shares: SlabShares): number {
  return shortSide(cell) * shares.cut;
}

/** Returns how tall a slab's lip is in its cell, in whole device pixels. */
function lipOf(cell: Area, shares: SlabShares): number {
  return Math.round(shortSide(cell) * shares.lip);
}

/** Returns the shorter of an area's two sides. */
function shortSide(area: Area): number {
  return Math.min(area.width, area.height);
}
