import { clamp } from "@fz/core/math";
import type { CssRect, Viewport } from "@fz/phaser/layout";
import { type Moving, type Place, type Torus, torusFor } from "../rules/torus";
import type { Span } from "../rules/tuning";

/** How thick the field's frame is, in CSS pixels. */
export const FRAME_CSS_PX = 2;

/** How tall the deck is under the field, a quarter of the stage's height within this, in CSS pixels. */
export const DECK_HEIGHT_CSS_PX: Span = { least: 136, most: 200 };

/** How wide each part of the deck is beside the field, a sixth of the stage's width within this, in CSS pixels. */
export const DECK_WIDTH_CSS_PX: Span = { least: 112, most: 176 };

/** The share of the stage's height the deck takes under the field. */
const DECK_HEIGHT_SHARE = 1 / 4;

/** The share of the stage's width each part of the deck takes beside the field. */
const DECK_WIDTH_SHARE = 1 / 6;

/** How much under a whole device pixel a size may fall and still count as it. */
const WHOLE = 1e-6;

/** Describes a rectangle on the canvas, in device pixels from its top left. */
export interface PixelRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Says how the board lays the field and the deck out. */
export interface BoardSetting {
  /**
   * The margin around the field, inside the room the deck leaves, in CSS
   * pixels: 12 on a compact screen, 24 on a roomy one.
   */
  readonly marginCss: number;
  /** Whether the deck shows: on a touch screen, or as the settings say. */
  readonly deck: boolean;
  /** Whether the deck's stick is on the right, for a left hand on the buttons. */
  readonly stickOnRight: boolean;
}

/** Says where the deck lies on the canvas: the stick's zone and the buttons'. */
export interface DeckLayout {
  /**
   * Whether it lies under the field, the two zones side by side; else the
   * zones lie one each side of it.
   */
  readonly under: boolean;
  /** Where the stick's base may land. */
  readonly stick: PixelRect;
  /** Where Fire and Dash lie. */
  readonly buttons: PixelRect;
}

/** Says where the field lies on the canvas. */
export interface FieldMetrics {
  /** A field unit, in device pixels, a fraction of one or not. */
  readonly unit: number;
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
  /** Device pixels to a CSS pixel. */
  readonly pixelRatio: number;
  /** The field, without its frame, in CSS pixels. */
  readonly css: CssRect;
}

/** Describes the deck's two zones, left and right, before the setting says which holds the stick. */
interface Zones {
  readonly under: boolean;
  readonly left: PixelRect;
  readonly right: PixelRect;
}

/**
 * Returns where the deck lies on a canvas around a field of a shape, or
 * null where it doesn't show: at the stage's edges, either along its
 * bottom, a quarter of its height, its two zones side by side, or a zone
 * each side of it, a sixth of its width, whichever leaves the field the
 * larger unit, so a window resized in play keeps the deck where its field
 * fits best. The stick's zone is the left unless the setting says.
 */
export function deckLayout(
  viewport: Viewport,
  board: BoardSetting,
  torus: Torus,
): DeckLayout | null {
  const zones = zonesOf(viewport, board, torus);
  if (!zones) return null;
  const { under, left, right } = zones;
  return board.stickOnRight
    ? { under, stick: right, buttons: left }
    : { under, stick: left, buttons: right };
}

/**
 * Returns the room a field of a shape and its frame may fill on a canvas:
 * the stage inside the chrome, less the deck where it shows, inside the
 * margin; none where the deck leaves none.
 */
export function fieldRoom(
  viewport: Viewport,
  board: BoardSetting,
  torus: Torus,
): PixelRect {
  return roomOf(viewport, board, zonesOf(viewport, board, torus));
}

/**
 * Returns the field's shape for its room on a canvas, as a wave starts or
 * while the game is paused: its short side 40 units, its long side as many
 * as the room holds at that unit, up to 88, the deck lying whichever way
 * leaves it the larger unit. A room with no area, as a hidden page's is,
 * keeps the shape the field had.
 */
export function fieldShape(
  viewport: Viewport,
  board: BoardSetting,
  last: Torus,
): Torus {
  const room = roomOf(viewport, board, zonesOf(viewport, board, null));
  const { width, height } = innerRoomOf(viewport, room);
  if (width <= 0 || height <= 0) return last;
  return torusFor(width, height);
}

/**
 * Returns where a field of a shape lies on a canvas: the largest that fits
 * its room with its frame, a unit whatever fraction of a device pixel that
 * makes, centered on whole device pixels, so the frame is sharp.
 *
 * On a canvas with no room for the field, a unit is still a device pixel,
 * and the field runs past its room.
 */
export function fieldMetrics(
  viewport: Viewport,
  board: BoardSetting,
  torus: Torus,
): FieldMetrics {
  const { pixelRatio } = viewport;
  const inner = innerRoomOf(viewport, fieldRoom(viewport, board, torus));
  const unit = Math.max(
    1,
    Math.min(inner.width / torus.width, inner.height / torus.height),
  );
  // A hair under a whole pixel, which the unit's rounding can leave, is one.
  const width = Math.floor(unit * torus.width + WHOLE);
  const height = Math.floor(unit * torus.height + WHOLE);
  const x = inner.x + Math.floor((inner.width - width) / 2);
  const y = inner.y + Math.floor((inner.height - height) / 2);
  return {
    unit,
    x,
    y,
    width,
    height,
    frame: frameOf(viewport),
    pixelRatio,
    css: {
      x: x / pixelRatio,
      y: y / pixelRatio,
      width: width / pixelRatio,
      height: height / pixelRatio,
    },
  };
}

/**
 * Returns where a place on the field lies on the canvas, in device pixels,
 * written into a record the caller keeps, so a frame allocates nothing.
 */
export function toCanvas(
  metrics: FieldMetrics,
  place: Place,
  into: Moving,
): Moving {
  into.x = metrics.x + place.x * metrics.unit;
  into.y = metrics.y + place.y * metrics.unit;
  return into;
}

/**
 * Returns where a place on the canvas lies on the field, in field units,
 * written into a record the caller keeps; a place off the field lies off
 * it, past 0 or its size.
 */
export function toField(
  metrics: FieldMetrics,
  place: Place,
  into: Moving,
): Moving {
  into.x = (place.x - metrics.x) / metrics.unit;
  into.y = (place.y - metrics.y) / metrics.unit;
  return into;
}

/**
 * Returns the deck's zones on a canvas, or null where it doesn't show:
 * under the field or beside it, whichever leaves a field of a shape the
 * larger unit, or, for null, the field each room would shape; and under it
 * where both leave the same.
 */
function zonesOf(
  viewport: Viewport,
  board: BoardSetting,
  torus: Torus | null,
): Zones | null {
  if (!board.deck) return null;
  const stage = stageOf(viewport);
  const toPixels = (css: number): number =>
    Math.round(css * viewport.pixelRatio);
  const tall = toPixels(
    clamp(
      (stage.height * DECK_HEIGHT_SHARE) / viewport.pixelRatio,
      DECK_HEIGHT_CSS_PX.least,
      DECK_HEIGHT_CSS_PX.most,
    ),
  );
  const top = stage.y + stage.height - tall;
  const half = Math.floor(stage.width / 2);
  const under: Zones = {
    under: true,
    left: { x: stage.x, y: top, width: half, height: tall },
    right: {
      x: stage.x + half,
      y: top,
      width: stage.width - half,
      height: tall,
    },
  };
  const wide = toPixels(
    clamp(
      (stage.width * DECK_WIDTH_SHARE) / viewport.pixelRatio,
      DECK_WIDTH_CSS_PX.least,
      DECK_WIDTH_CSS_PX.most,
    ),
  );
  const beside: Zones = {
    under: false,
    left: { x: stage.x, y: stage.y, width: wide, height: stage.height },
    right: {
      x: stage.x + stage.width - wide,
      y: stage.y,
      width: wide,
      height: stage.height,
    },
  };
  return unitIn(viewport, roomOf(viewport, board, under), torus) >=
    unitIn(viewport, roomOf(viewport, board, beside), torus)
    ? under
    : beside;
}

/**
 * Returns the room the deck's zones leave the field and its frame on a
 * canvas, inside the margin, never less than nothing across or down.
 */
function roomOf(
  viewport: Viewport,
  board: BoardSetting,
  zones: Zones | null,
): PixelRect {
  const stage = stageOf(viewport);
  const margin = Math.round(board.marginCss * viewport.pixelRatio);
  let { x, width, height } = stage;
  if (zones?.under) {
    height = zones.left.y - stage.y;
  } else if (zones) {
    x = zones.left.x + zones.left.width;
    width = zones.right.x - x;
  }
  return {
    x: x + margin,
    y: stage.y + margin,
    width: Math.max(0, width - 2 * margin),
    height: Math.max(0, height - 2 * margin),
  };
}

/**
 * Returns the unit a field of a shape gets fitted whole into a room, or,
 * for null, the field the room shapes, in device pixels; 0 for a room with
 * no area.
 */
function unitIn(
  viewport: Viewport,
  room: PixelRect,
  torus: Torus | null,
): number {
  const { width, height } = innerRoomOf(viewport, room);
  if (width <= 0 || height <= 0) return 0;
  const fitted = torus ?? torusFor(width, height);
  return Math.min(width / fitted.width, height / fitted.height);
}

/** Returns the canvas inside its chrome, in whole device pixels. */
function stageOf(viewport: Viewport): PixelRect {
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

/** Returns a room for the field inside its frame. */
function innerRoomOf(viewport: Viewport, room: PixelRect): PixelRect {
  const frame = frameOf(viewport);
  return {
    x: room.x + frame,
    y: room.y + frame,
    width: room.width - 2 * frame,
    height: room.height - 2 * frame,
  };
}

/** Returns how thick the frame is on a canvas, in whole device pixels, one at least. */
function frameOf(viewport: Viewport): number {
  return Math.max(1, Math.round(FRAME_CSS_PX * viewport.pixelRatio));
}
