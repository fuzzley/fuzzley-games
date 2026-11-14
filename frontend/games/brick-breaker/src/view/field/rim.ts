// The rim round the field on its left, its top and its right, as the
// uplift's art kit's `fieldScene()` draws it: wider than the layout's wall,
// into the room the canvas leaves round the field.

import { PANEL_GAP_CSS_PX } from "@fz/phaser/layout";
import type { FieldMetrics } from "./field_metrics";

/**
 * The field's rim: how wide, in field units, how round its outer corners
 * are and how tall the lip at its foot is, as shares of its width.
 */
export const RIM = { width: 0.3, corner: 1.6, lip: 0.35 } as const;

/**
 * Returns how wide the field's rim is, in whole device pixels: the kit's
 * {@link RIM} width, never narrower than the layout's wall, nor wider than
 * the wall and half the gap the side panels keep from it, so it never
 * reaches under a panel.
 */
export function rimWidth({
  unit,
  wall,
  pixelRatio,
}: Pick<FieldMetrics, "unit" | "wall" | "pixelRatio">): number {
  const most = wall + Math.floor((PANEL_GAP_CSS_PX * pixelRatio) / 2);
  return Math.max(wall, Math.min(most, Math.round(RIM.width * unit)));
}
