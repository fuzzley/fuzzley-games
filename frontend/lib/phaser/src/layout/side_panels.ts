import { type CssRect, type PixelRect, cssRectOf } from "./layout";

/** How far a panel stands from the field beside it, in CSS pixels. */
export const PANEL_GAP_CSS_PX = 12;

/**
 * How wide a panel is, in CSS pixels: the narrowest that shows, the layout
 * check's least for a zone, and the widest it grows.
 */
export const PANEL_WIDTH_CSS_PX = { least: 172, most: 320 } as const;

/** Says where the two panels beside a field lie on the canvas, in CSS pixels. */
export interface SidePanels {
  readonly left: CssRect;
  readonly right: CssRect;
}

/** How much under a whole number a size may fall and still count as it. */
const WHOLE = 1e-6;

/**
 * Returns where a panel stands either side of a field on a canvas, given
 * the room inside the canvas's insets and the field, both in device pixels:
 * {@link PANEL_GAP_CSS_PX} from the field, as tall as it and level with it,
 * each as wide as the room's narrower side spares past the gap, up to
 * {@link PANEL_WIDTH_CSS_PX}'s most, the gap and the width in whole device
 * pixels; or null where that is narrower than its least.
 *
 * So a side must spare 184 CSS px at a whole pixel ratio, and at another
 * up to a device pixel and a half more, or half a pixel less, as the gap
 * and the least round to whole device pixels. The field is whatever a
 * panel keeps its gap from, such as the cells, or a wall drawn inside the
 * room around them.
 */
export function sidePanels(
  room: PixelRect,
  field: PixelRect,
  pixelRatio: number,
): SidePanels | null {
  const spare = Math.floor(
    Math.min(field.x - room.x, room.x + room.width - field.x - field.width),
  );
  const gap = Math.round(PANEL_GAP_CSS_PX * pixelRatio);
  const width = Math.min(
    Math.round(PANEL_WIDTH_CSS_PX.most * pixelRatio),
    spare - gap,
  );
  if (width < PANEL_WIDTH_CSS_PX.least * pixelRatio - WHOLE) return null;
  const { y, height } = field;
  return {
    left: cssRectOf({ x: field.x - gap - width, y, width, height }, pixelRatio),
    right: cssRectOf(
      { x: field.x + field.width + gap, y, width, height },
      pixelRatio,
    ),
  };
}
