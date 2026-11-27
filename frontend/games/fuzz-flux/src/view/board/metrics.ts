// The board fitted to the room on its canvas, as the screen shows it: a
// margin around it where the room spares one, and a square of whole device
// pixels that the margin gives way to before it falls under the least the
// kinds and the specials' furs still read at.

import {
  type CssRect,
  type SidePanels,
  type Viewport,
  cssRectOf,
  fitCells,
  roomInside,
  sidePanels,
} from "@fz/phaser/layout";

/**
 * The least side a square takes where the room holds it, in CSS pixels: the
 * smallest at which the kinds and the specials' furs still read, and what 8
 * columns leave on a phone 320 px wide.
 */
const LEAST_SQUARE_CSS_PX = 40;

/** How far the board keeps from the room's edges where the room spares it, in CSS pixels. */
const MARGIN_CSS_PX = 16;

/** Says where the board lies on the canvas. */
export interface BoardMetrics {
  /** A square's side, in whole device pixels. */
  readonly square: number;
  /** The board's left edge, in whole device pixels. */
  readonly x: number;
  /** The board's top edge, in whole device pixels. */
  readonly y: number;
  /** The board's width, in whole device pixels. */
  readonly width: number;
  /** The board's height, in whole device pixels. */
  readonly height: number;
  /** The board, in CSS pixels. */
  readonly css: CssRect;
  /**
   * Where a wide window's panels stand either side of the board, in CSS
   * pixels, the bar's on the left and the buttons' on the right; or null
   * where the room spares too little for them (`sidePanels()`).
   */
  readonly panels: SidePanels | null;
}

/**
 * How far over a whole number a size may run and still count as it, as a
 * product does at a pixel ratio a browser keeps in single precision, such as
 * 1.100000023841858 at a zoom of 110%.
 */
const WHOLE = 1e-6;

/**
 * Returns where a board so many squares across and down lies on a canvas:
 * the largest that fits inside the chrome with {@link MARGIN_CSS_PX} around
 * it, unless that leaves a square under {@link LEAST_SQUARE_CSS_PX}, when
 * the margin gives way until the square is that or fills the room; each
 * square whole device pixels, the board centered on whole pixels.
 */
export function boardMetrics(
  viewport: Viewport,
  across: number,
  down: number,
): BoardMetrics {
  const { pixelRatio } = viewport;
  const room = roomInside(viewport);
  const fit = fitCells(viewport, { across, down, frameCss: MARGIN_CSS_PX });
  const least = Math.ceil(LEAST_SQUARE_CSS_PX * pixelRatio - WHOLE);
  const filling = Math.floor(Math.min(room.width / across, room.height / down));
  const square = Math.max(fit.cell, Math.min(least, filling));
  const width = square * across;
  const height = square * down;
  const x = room.x + Math.floor((room.width - width) / 2);
  const y = room.y + Math.floor((room.height - height) / 2);
  const board = { x, y, width, height };
  return {
    square,
    x,
    y,
    width,
    height,
    css: cssRectOf(board, pixelRatio),
    panels: sidePanels(room, board, pixelRatio),
  };
}
