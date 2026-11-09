import type { Insets } from "../insets";

/** Describes a canvas a field is laid out on. */
export interface Viewport {
  /** The canvas's width, in device pixels. */
  readonly width: number;
  /** The canvas's height, in device pixels. */
  readonly height: number;
  /** Device pixels to a CSS pixel. */
  readonly pixelRatio: number;
  /** How far the app's chrome lies over each edge, in CSS pixels. */
  readonly insets: Insets;
}

/** Describes a rectangle on the canvas, in CSS pixels from its top left. */
export interface CssRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Describes a rectangle on the canvas, in device pixels from its top left. */
export interface PixelRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Says how big a field of cells is, and how thick the frame around it. */
export interface CellField {
  /** How many cells the field has across. */
  readonly across: number;
  /** How many cells the field has down. */
  readonly down: number;
  /** How thick the frame around it is, in CSS pixels. */
  readonly frameCss: number;
}

/** Says where a field of cells lies on the canvas. */
export interface CellFit {
  /** A cell's side, in whole device pixels. */
  readonly cell: number;
  /** The field's left edge, in whole device pixels. */
  readonly x: number;
  /** The field's top edge, in whole device pixels. */
  readonly y: number;
  /** The field's width, in whole device pixels. */
  readonly width: number;
  /** The field's height, in whole device pixels. */
  readonly height: number;
  /** How thick the frame around it is, in whole device pixels. */
  readonly frame: number;
  /** The field, without its frame, in CSS pixels. */
  readonly css: CssRect;
}

/**
 * Returns where a field of square cells lies on a canvas: the largest that
 * fits inside the chrome with room for its frame, each cell a whole number
 * of device pixels so its edges are sharp, centered on whole pixels.
 *
 * On a canvas too small for the field, a cell is still a device pixel, and
 * the field runs past the insets.
 */
export function fitCells(viewport: Viewport, field: CellField): CellFit {
  const { pixelRatio } = viewport;
  const frame = framePixels(field.frameCss, pixelRatio);
  const room = roomInside(viewport);
  const cell = Math.max(
    1,
    Math.floor(
      Math.min(
        (room.width - 2 * frame) / field.across,
        (room.height - 2 * frame) / field.down,
      ),
    ),
  );
  const width = cell * field.across;
  const height = cell * field.down;
  const x = room.x + Math.floor((room.width - width) / 2);
  const y = room.y + Math.floor((room.height - height) / 2);
  const css = cssRectOf({ x, y, width, height }, pixelRatio);
  return { cell, x, y, width, height, frame, css };
}

/**
 * Returns the room on a canvas inside the app's chrome, in whole device
 * pixels, each inset rounded to the nearest, as every board rounds them.
 */
export function roomInside(viewport: Viewport): PixelRect {
  const { width, height, pixelRatio, insets } = viewport;
  const left = Math.round(insets.left * pixelRatio);
  const top = Math.round(insets.top * pixelRatio);
  return {
    x: left,
    y: top,
    width: width - left - Math.round(insets.right * pixelRatio),
    height: height - top - Math.round(insets.bottom * pixelRatio),
  };
}

/**
 * Returns how thick a frame of some CSS pixels is on a canvas, in whole
 * device pixels, so its edges are sharp, and one at least, so it shows.
 */
export function framePixels(frameCss: number, pixelRatio: number): number {
  return Math.max(1, Math.round(frameCss * pixelRatio));
}

/**
 * Returns a rectangle on the canvas in CSS pixels, given in device pixels at
 * a pixel ratio.
 */
export function cssRectOf(
  { x, y, width, height }: PixelRect,
  pixelRatio: number,
): CssRect {
  return {
    x: x / pixelRatio,
    y: y / pixelRatio,
    width: width / pixelRatio,
    height: height / pixelRatio,
  };
}
