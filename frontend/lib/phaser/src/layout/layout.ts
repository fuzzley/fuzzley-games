import type { Insets } from "../insets";

/** Describes the canvas a field of cells is laid out on. */
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
  const { width, height, pixelRatio, insets } = viewport;
  const frame = Math.max(1, Math.round(field.frameCss * pixelRatio));
  const left = Math.round(insets.left * pixelRatio);
  const top = Math.round(insets.top * pixelRatio);
  const roomAcross = width - left - Math.round(insets.right * pixelRatio);
  const roomDown = height - top - Math.round(insets.bottom * pixelRatio);
  const cell = Math.max(
    1,
    Math.floor(
      Math.min(
        (roomAcross - 2 * frame) / field.across,
        (roomDown - 2 * frame) / field.down,
      ),
    ),
  );
  const fieldWidth = cell * field.across;
  const fieldHeight = cell * field.down;
  const x = left + Math.floor((roomAcross - fieldWidth) / 2);
  const y = top + Math.floor((roomDown - fieldHeight) / 2);
  return {
    cell,
    x,
    y,
    width: fieldWidth,
    height: fieldHeight,
    frame,
    css: {
      x: x / pixelRatio,
      y: y / pixelRatio,
      width: fieldWidth / pixelRatio,
      height: fieldHeight / pixelRatio,
    },
  };
}
