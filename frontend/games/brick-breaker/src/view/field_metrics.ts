import { type CssRect, type Viewport, fitCells } from "@fz/phaser/layout";
import { FIELD_WIDTH } from "../rules/tuning";

/** Says where the field lies on the canvas. */
export interface FieldMetrics {
  /** A field unit, in whole device pixels. */
  readonly unit: number;
  /** The field's left edge, in whole device pixels. */
  readonly x: number;
  /** The field's top edge, in whole device pixels. */
  readonly y: number;
  /** The field's width, in device pixels. */
  readonly width: number;
  /** The field's height, in device pixels. */
  readonly height: number;
  /** How thick the wall is, in whole device pixels. */
  readonly wall: number;
  /** Device pixels to a CSS pixel. */
  readonly pixelRatio: number;
  /** The field, without its wall, in CSS pixels. */
  readonly css: CssRect;
}

/** How thick the wall is, in CSS pixels. */
export const WALL_CSS_PX = 2;

/**
 * Returns where a field `down` units tall lies on a canvas: the largest that
 * fits inside the chrome, a unit a whole number of device pixels so every
 * brick's edge is sharp, centered with room for a wall on every side, though
 * the wall is drawn only on the left, the top and the right.
 */
export function fieldMetrics(viewport: Viewport, down: number): FieldMetrics {
  const fit = fitCells(viewport, {
    across: FIELD_WIDTH,
    down,
    frameCss: WALL_CSS_PX,
  });
  return {
    unit: fit.cell,
    x: fit.x,
    y: fit.y,
    width: fit.width,
    height: fit.height,
    wall: fit.frame,
    pixelRatio: viewport.pixelRatio,
    css: fit.css,
  };
}

/** Returns where a place across the field lies on the canvas, in device pixels. */
export function toCanvasX(metrics: FieldMetrics, x: number): number {
  return metrics.x + x * metrics.unit;
}

/** Returns where a place down the field lies on the canvas, in device pixels. */
export function toCanvasY(metrics: FieldMetrics, y: number): number {
  return metrics.y + y * metrics.unit;
}

/** Returns where a place on the canvas lies across the field, in field units. */
export function toFieldX(metrics: FieldMetrics, x: number): number {
  return (x - metrics.x) / metrics.unit;
}

/** Returns where a place on the canvas lies down the field, in field units. */
export function toFieldY(metrics: FieldMetrics, y: number): number {
  return (y - metrics.y) / metrics.unit;
}
