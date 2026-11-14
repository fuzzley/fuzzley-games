// The slab a brick game's brick stands on: its body, a darker lip along its
// foot and a lighter strip along its top, three flat shapes, every length a
// share of its cell's short side, so a square tile and a brick twice as wide
// as tall are laid out by the same code, and differ only in their shares.

import { mixColors } from "../color";
import {
  type Area,
  type ArtScale,
  type DrawCommand,
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
  strip: 0.05,
  lip: 0.07,
  lipShade: 0.22,
  stripLight: 0.22,
};

/** Brick Breaker's brick, two units wide and one tall: rounder than the tile, with a deeper strip and lip, and its lip a little darker. */
export const BRICK_SLAB: SlabShares = {
  gap: 0.04,
  corner: 0.16,
  strip: 0.07,
  lip: 0.09,
  lipShade: 0.24,
  stripLight: 0.22,
};

/** How many CSS pixels wide a brick is, at least, where it shows its finest detail. */
const DETAIL_CSS_PX = 30;

const WHITE = 0xffffff;
const BLACK = 0x000000;

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
 * Returns a slab in its cell, in an ink: a darker lip along its foot, its
 * body, and a lighter strip along its top, round its corners, three flat
 * shapes, the lip's and the strip's straight edges on whole device pixels.
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
  return [
    roundRect({ ...face, y: face.y + lipOf(cell, shares) }, radius, {
      color: mixColors(BLACK, ink, shares.lipShade),
    }),
    roundRect(face, radius, { color: ink }),
    polygon(topStrip(body, radius, Math.round(side * shares.strip)), {
      color: mixColors(WHITE, ink, shares.stripLight),
    }),
  ];
}

/**
 * Returns the points of what covers a slab's body from its top down to a
 * foot, round its top corners, a radius round, from the foot at its left
 * edge to the foot at its right: what a cap of moss is cut from.
 */
export function topCap(
  body: Area,
  radius: number,
  foot: number,
): readonly Point[] {
  const { left, right } = topCorners(body, radius);
  return [
    { x: body.x, y: foot },
    ...arcPoints(left, radius, Math.PI, 1.5 * Math.PI),
    ...arcPoints(right, radius, 1.5 * Math.PI, 2 * Math.PI),
    { x: body.x + body.width, y: foot },
  ];
}

/** Returns the points of the strip along a body's top edge, round its corners, a strip's height deep. */
function topStrip(body: Area, radius: number, strip: number): readonly Point[] {
  const { left, right } = topCorners(body, radius);
  return [
    ...arcPoints(left, radius, Math.PI, 1.5 * Math.PI),
    ...arcPoints(right, radius, 1.5 * Math.PI, 2 * Math.PI),
    ...arcPoints(
      { ...right, y: right.y + strip },
      radius,
      2 * Math.PI,
      1.5 * Math.PI,
    ),
    ...arcPoints(
      { ...left, y: left.y + strip },
      radius,
      1.5 * Math.PI,
      Math.PI,
    ),
  ];
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

/** Returns how tall a slab's lip is in its cell, in whole device pixels. */
function lipOf(cell: Area, shares: SlabShares): number {
  return Math.round(shortSide(cell) * shares.lip);
}

/** Returns the shorter of an area's two sides. */
function shortSide(area: Area): number {
  return Math.min(area.width, area.height);
}
