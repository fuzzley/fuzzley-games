import { clamp } from "@fz/core/math";
import {
  type CssRect,
  type PixelRect,
  type Viewport,
  cssRectOf,
  roomInside,
} from "@fz/phaser/layout";
import type { ArtScale } from "@fz/phaser/shapes";
import { COLUMNS, LEAST_DEPTH, MOST_DEPTH } from "../../rules/tuning";

/**
 * Says what shape of field a room holds: its unit and its depth, and how
 * thick its floor's band and its lintel are, worked out between rounds.
 */
export interface FieldShape {
  /** A field unit, in whole device pixels. */
  readonly unit: number;
  /** How many rows the field is deep, 11 to 22. */
  readonly depth: number;
  /** How thick the floor's band is, in units: 0.6 to 1.1. */
  readonly band: number;
  /** How thick the lintel over the ceiling is, in units: 0.5 at least. */
  readonly lintel: number;
  /** Whether the room has space for a panel either side of the field. */
  readonly panels: boolean;
  /** Device pixels to a CSS pixel. */
  readonly pixelRatio: number;
}

/**
 * Says where the field lies on the canvas: its cells, nine units across and
 * its depth's down, from the ceiling to the floor, with the floor's band
 * under them and the lintel over them, as its shape says, and the panels
 * beside it.
 */
export interface FieldMetrics extends ArtScale {
  /** The cells' left edge, in whole device pixels. */
  readonly x: number;
  /** The cells' top edge, the ceiling, in whole device pixels. */
  readonly y: number;
  /** The cells' width, in device pixels. */
  readonly width: number;
  /** The cells' height, in device pixels. */
  readonly height: number;
  /** The cells, in CSS pixels. */
  readonly css: CssRect;
  /**
   * The field from the lintel's top to the band's bottom, the frame drawn
   * around it, in CSS pixels.
   */
  readonly framed: CssRect;
  /** Where the two panels lie, in CSS pixels, or null where the room has no space for them. */
  readonly panels: { readonly left: CssRect; readonly right: CssRect } | null;
}

/** Describes a place, which {@link toCanvas} and {@link toField} write into where a caller hands one over. */
export interface Place {
  x: number;
  y: number;
}

/**
 * The margin the board keeps around the room the field fills, on a compact
 * screen and on a roomy one, in CSS pixels, which it declares as the
 * canvas's insets.
 */
export const MARGIN_CSS_PX = { compact: 12, roomy: 24 } as const;

/**
 * How thick the frame around the field is, in CSS pixels. It lies in the
 * margin, outside the room, so the room the field fills keeps its whole
 * size.
 */
export const FRAME_CSS_PX = 2;

/** How thick the floor's band is, in field units: its thinnest, and its thickest, as a room's spare thickens it. */
export const FLOOR_BAND = { least: 0.6, most: 1.1 } as const;

/**
 * How thick the lintel over the ceiling is, in field units: its thinnest,
 * and its thickest, as what a room spares past the floor's band thickens
 * it.
 */
export const LINTEL = { least: 0.5, most: 1 } as const;

/** How far a panel stands from the field's cells, in CSS pixels. */
export const PANEL_GAP_CSS_PX = 12;

/**
 * How wide a panel is, in CSS pixels: the narrowest that shows, the layout
 * check's least for a zone, and the widest it grows.
 */
export const PANEL_WIDTH_CSS_PX = { least: 172, most: 320 } as const;

/** How much under a whole number a size may fall and still count as it. */
const WHOLE = 1e-6;

/**
 * Returns the shape of field a canvas's room holds: a unit the smaller of
 * its width over 9 and its height over the least field, 11 rows, the
 * floor's thinnest band and the thinnest lintel, in whole device pixels; as
 * many rows as its height holds at that unit, past the band and the
 * lintel, 22 at most; and what is left over thickening the band, then the
 * lintel.
 *
 * A room that holds more than 22 rows, past the thickest band and lintel,
 * leaves the rest spare, and {@link fieldMetrics} centers the field in it.
 * A room with no area, as a hidden board's is, gets the least field at a
 * unit of a device pixel, so a caller keeps the shape it has where
 * {@link hasRoom} says none.
 *
 * A depth set, as the debug menu sets one, is the field's whatever the
 * room: the unit is the largest that fits that many rows past the thinnest
 * band and lintel, and what is left over thickens them.
 */
export function fieldShape(
  viewport: Viewport,
  depthSet: number | null = null,
): FieldShape {
  const room = roomInside(viewport);
  const thinnest = FLOOR_BAND.least + LINTEL.least;
  const unit = unitFitting(room, (depthSet ?? LEAST_DEPTH) + thinnest);
  const down = room.height / unit;
  const depth =
    depthSet ?? clamp(wholeOf(down - thinnest), LEAST_DEPTH, MOST_DEPTH);
  const spare = Math.max(0, down - depth - thinnest);
  const toBand = Math.min(spare, FLOOR_BAND.most - FLOOR_BAND.least);
  const toLintel = Math.min(spare - toBand, LINTEL.most - LINTEL.least);
  return {
    unit,
    depth,
    band: FLOOR_BAND.least + toBand,
    lintel: LINTEL.least + toLintel,
    panels:
      panelWidthOf(sideSpare(room.width, unit), viewport.pixelRatio) !== null,
    pixelRatio: viewport.pixelRatio,
  };
}

/**
 * Returns whether a canvas has room inside its insets for a field, which a
 * hidden board's has not; where it has none, a caller keeps the shape and
 * the layout it has, and lays nothing out.
 */
export function hasRoom(viewport: Viewport): boolean {
  const room = roomInside(viewport);
  return room.width > 0 && room.height > 0;
}

/**
 * Returns where a field of a shape lies on a canvas: at the shape's unit,
 * its cells, its band and its lintel centered in the canvas's room on whole
 * device pixels; and a panel either side, as tall as the field from the
 * lintel's top to the band's bottom, where the room spares
 * {@link PANEL_GAP_CSS_PX} and a panel's least width each side.
 *
 * On the room the shape was worked out for, the field fills it from top to
 * bottom, unless the most rows leave some spare. A room resized since, as
 * one is while a round flies, keeps the shape's depth, band and lintel, and
 * its unit too while the field overruns the room by a CSS pixel at most, in
 * whole device pixels, which the margin takes, so a pixel's jitter bakes no
 * art again; a field that overruns it by more, or a pixel ratio changed
 * since, takes the largest unit that fits.
 */
export function fieldMetrics(
  viewport: Viewport,
  shape: FieldShape,
): FieldMetrics {
  const { pixelRatio } = viewport;
  const room = roomInside(viewport);
  const slack = Math.ceil(pixelRatio);
  const unit =
    pixelRatio === shape.pixelRatio &&
    COLUMNS * shape.unit <= room.width + slack &&
    fieldPixels(shape, shape.unit) <= room.height + slack
      ? shape.unit
      : unitFitting(room, shape.depth + shape.band + shape.lintel);
  const width = COLUMNS * unit;
  const height = shape.depth * unit;
  const lintel = lintelPixels(shape, unit);
  const tall = fieldPixels(shape, unit);
  const spare = sideSpare(room.width, unit);
  const x = room.x + spare;
  const top = room.y + Math.floor((room.height - tall) / 2);
  const y = top + lintel;
  const panel = panelWidthOf(spare, pixelRatio);
  const gap = Math.round(PANEL_GAP_CSS_PX * pixelRatio);
  return {
    unit,
    pixelRatio,
    x,
    y,
    width,
    height,
    css: cssRectOf({ x, y, width, height }, pixelRatio),
    framed: cssRectOf({ x, y: top, width, height: tall }, pixelRatio),
    panels:
      panel === null
        ? null
        : {
            left: cssRectOf(
              { x: x - gap - panel, y: top, width: panel, height: tall },
              pixelRatio,
            ),
            right: cssRectOf(
              { x: x + width + gap, y: top, width: panel, height: tall },
              pixelRatio,
            ),
          },
  };
}

/**
 * Returns how thick a shape's lintel is at a unit, in whole device pixels,
 * rounded up, so it is never under its thinnest; with {@link bandPixels},
 * it fills what the room the shape was worked out for spares its cells.
 */
export function lintelPixels(shape: FieldShape, unit: number): number {
  return Math.ceil(shape.lintel * unit - WHOLE);
}

/** Returns how thick a shape's floor's band is at a unit, in whole device pixels, rounded down. */
export function bandPixels(shape: FieldShape, unit: number): number {
  return wholeOf(shape.band * unit);
}

/** Returns how tall a shape's field is at a unit, from the lintel's top to the band's bottom, in device pixels. */
function fieldPixels(shape: FieldShape, unit: number): number {
  return (
    lintelPixels(shape, unit) + shape.depth * unit + bandPixels(shape, unit)
  );
}

/**
 * Returns the largest whole unit, a device pixel at least, at which a field
 * 9 units across and some units down fits a room.
 */
function unitFitting(room: PixelRect, down: number): number {
  return Math.max(
    1,
    wholeOf(Math.min(room.width / COLUMNS, room.height / down)),
  );
}

/**
 * Returns where a place on the field, in units across from the left wall
 * and up from the floor, lies on the canvas, in device pixels, written into
 * the place a caller hands over, or else a new one, which a frame's
 * drawing, called again and again, never asks for.
 */
export function toCanvas(
  metrics: FieldMetrics,
  x: number,
  y: number,
  into: Place = { x: 0, y: 0 },
): Place {
  into.x = metrics.x + x * metrics.unit;
  into.y = metrics.y + metrics.height - y * metrics.unit;
  return into;
}

/**
 * Returns where a place on the canvas, in device pixels, lies on the field,
 * in units across from the left wall and up from the floor, written into
 * the place a caller hands over, or else a new one; a place off the field
 * lies off it, past 0, 9 or the depth.
 */
export function toField(
  metrics: FieldMetrics,
  x: number,
  y: number,
  into: Place = { x: 0, y: 0 },
): Place {
  into.x = (x - metrics.x) / metrics.unit;
  into.y = (metrics.y + metrics.height - y) / metrics.unit;
  return into;
}

/** Returns how many whole device pixels a room spares on the cells' left, the narrower side where it spares an odd number. */
function sideSpare(roomWidth: number, unit: number): number {
  return Math.floor((roomWidth - COLUMNS * unit) / 2);
}

/**
 * Returns how wide a panel is beside a field that a room spares some
 * device pixels on each side of, in device pixels, or null where it would
 * be narrower than a panel's least.
 */
function panelWidthOf(spare: number, pixelRatio: number): number | null {
  const width = Math.min(
    Math.round(PANEL_WIDTH_CSS_PX.most * pixelRatio),
    spare - Math.round(PANEL_GAP_CSS_PX * pixelRatio),
  );
  return width >= PANEL_WIDTH_CSS_PX.least * pixelRatio - WHOLE ? width : null;
}

/**
 * Returns a size rounded down to a whole number, a hair under one, which a
 * quotient's rounding can leave, counting as it.
 */
function wholeOf(size: number): number {
  return Math.floor(size + WHOLE);
}
