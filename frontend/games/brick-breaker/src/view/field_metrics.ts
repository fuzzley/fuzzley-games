import { type CssRect, type Viewport, fitCells } from "@fz/phaser/layout";
import { FIELD_HEIGHT, FIELD_WIDTH, TALLEST_FIELD } from "../rules/tuning";

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
 * The room a board with room for a field taller than {@link FIELD_HEIGHT}
 * leaves under the field, in CSS pixels, for a finger to steer the paddle by
 * without hiding it.
 */
export const FINGER_ROOM_CSS_PX = 64;

/**
 * Returns how tall a field a canvas has room for, in field units: the
 * tallest, from {@link FIELD_HEIGHT} to {@link TALLEST_FIELD}, that keeps
 * the unit its width allows above a finger's room.
 *
 * It counts a device pixel more across, and a CSS pixel less down, than the
 * canvas measured, so one the browser sizes a pixel wider or shorter still
 * lays the field out at the unit its width allows.
 */
export function fieldHeightFor(viewport: Viewport): number {
  const room: Viewport = {
    ...viewport,
    width: viewport.width + 1,
    insets: {
      ...viewport.insets,
      bottom: viewport.insets.bottom + FINGER_ROOM_CSS_PX + 1,
    },
  };
  // The largest unit any field gets: the width's, unless the canvas has
  // little room down. At the least, 1, every field gets it, however tall.
  const largest = fieldMetrics(room, 1).unit;
  if (largest <= 1) return FIELD_HEIGHT;
  let down = TALLEST_FIELD;
  while (down > FIELD_HEIGHT && fieldMetrics(room, down).unit < largest) {
    down--;
  }
  return down;
}

/**
 * Returns the room a board leaves under the field for a finger, in CSS
 * pixels, given how tall a field it has room for:
 * {@link FINGER_ROOM_CSS_PX} where a field taller than {@link FIELD_HEIGHT}
 * fits, and none where it doesn't.
 */
export function fingerRoomOf(roomFor: number): number {
  return roomFor > FIELD_HEIGHT ? FINGER_ROOM_CSS_PX : 0;
}

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
