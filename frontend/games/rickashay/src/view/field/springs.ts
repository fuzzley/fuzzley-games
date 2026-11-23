// Where Rickashay's field draws the floor bounces a flight holds: a spring
// each in the floor's band under the cells, at its right end, the field
// itself laid out as every wall game's is.

import {
  type FieldMetrics,
  type FieldShape,
  type Place,
  bandPixels,
} from "@fz/brick-wall/view/field_metrics";
import type { FlightRules } from "../../rules/tuning";

/** How wide a spring is at most, in field units. */
export const SPRING_UNITS = 0.55;

/** How much of the band a spring leaves clear above it and below it, at least, in CSS pixels. */
export const SPRING_PAD_CSS_PX = 3;

/** How far apart two springs side by side stand, in CSS pixels. */
export const SPRING_GAP_CSS_PX = 4;

/**
 * How far in from the field's right wall the last spring stands, in CSS
 * pixels, and the first, at the nearest, from its left wall.
 */
export const SPRINGS_RIGHT_CSS_PX = 8;

/** Says where the band's springs lie on the canvas, each a square. */
export interface BandSprings {
  /** A spring's side, in whole device pixels: none where the band is too thin for one. */
  readonly size: number;
  /**
   * Each spring's top left corner, in whole device pixels, from the left:
   * a flight that holds some floor bounces lights that many from the
   * first.
   */
  readonly corners: readonly Place[];
}

/**
 * Returns where a field's floor's band draws a spring for each floor bounce
 * a fuzzball can hold, side by side at the band's right end.
 *
 * Where a retuned count of floor bounces is too many for the band's width,
 * the springs narrow till they fit between its two margins.
 *
 * It is worked out as the field is laid out, not each frame, so it makes a
 * new record each time.
 */
export function bandSprings(
  metrics: FieldMetrics,
  shape: FieldShape,
  { mostBounces }: Pick<FlightRules, "mostBounces">,
): BandSprings {
  const { unit, pixelRatio } = metrics;
  const band = bandPixels(shape, unit);
  const pad = Math.round(SPRING_PAD_CSS_PX * pixelRatio);
  const gap = Math.round(SPRING_GAP_CSS_PX * pixelRatio);
  const margin = Math.round(SPRINGS_RIGHT_CSS_PX * pixelRatio);
  const tallest = Math.max(
    0,
    Math.floor(Math.min(band - 2 * pad, SPRING_UNITS * unit)),
  );
  // From one spring's left edge to the next one's, narrowed so that every
  // spring and every gap between them fit between the margins.
  const pitch = Math.max(
    0,
    Math.min(
      tallest + gap,
      Math.floor((metrics.width - 2 * margin + gap) / mostBounces),
    ),
  );
  const size = Math.max(0, pitch - gap);
  const y = metrics.y + metrics.height + Math.floor((band - size) / 2);
  const last = metrics.x + metrics.width - margin - size;
  const corners: Place[] = [];
  for (let at = 0; at < mostBounces; at++) {
    corners.push({ x: last - (mostBounces - 1 - at) * pitch, y });
  }
  return { size, corners };
}
