// What a wave sends across the field, each once, from an edge, without
// wrapping, which the strays and the comets share: coming in, flying across
// and reaching what lies on the field.

import { clamp } from "@fz/core/math";
import { RADIANS_PER_DEGREE } from "../angles";
import { drawIn, nextDraw } from "../draws";
import type { Field } from "../field/field";
import { type Place, type Torus, distanceSquared } from "../torus";
import { ENTRY_ALONG, STEP_S } from "../tuning";

/** Describes something that crosses the field once, from an edge, without wrapping. */
export interface Crossing {
  /** Whether it is on its way; a record that isn't waits for the next. */
  live: boolean;
  x: number;
  y: number;
  /** The way it flies. */
  heading: number;
  /** Where it was a step ago, for the scene to draw between, as the ship's is. */
  lastX: number;
  lastY: number;
}

/** Returns a crossing's record, not on its way. */
export function blankCrossing(): Crossing {
  return { live: false, x: 0, y: 0, heading: 0, lastX: 0, lastY: 0 };
}

/**
 * Puts a crossing off one of the field's edges by a margin, away from its
 * corners, heading across the field and toward the edge's middle by up to a
 * tilt, in degrees, the edge, the place and the tilt each drawn.
 */
export function comeIn(
  field: Field,
  crossing: Crossing,
  margin: number,
  tilt: number,
): void {
  const { width, height } = field.torus;
  const edge = Math.floor(nextDraw(field) * 4);
  const along = drawIn(field, ENTRY_ALONG);
  // Turns the heading down a left or right edge, or right along the top or
  // bottom, from the edge's first half, and back from its second.
  const off =
    (along < 0.5 ? 1 : -1) * nextDraw(field) * tilt * RADIANS_PER_DEGREE;
  switch (edge) {
    case 0:
      // The left edge, heading right.
      place(crossing, -margin, along * height, off);
      break;
    case 1:
      // The right edge, heading left.
      place(crossing, width + margin, along * height, Math.PI - off);
      break;
    case 2:
      // The top edge, heading down.
      place(crossing, along * width, -margin, Math.PI / 2 - off);
      break;
    default:
      // The bottom edge, heading up.
      place(crossing, along * width, height + margin, 1.5 * Math.PI + off);
  }
}

/** Returns the place on the field's edge nearest a crossing, which waits off it as it comes in. */
export function edgeOf(crossing: Readonly<Crossing>, torus: Torus): Place {
  return {
    x: clamp(crossing.x, 0, torus.width),
    y: clamp(crossing.y, 0, torus.height),
  };
}

/** Flies a crossing a step along its heading at a speed, without wrapping. */
export function fly(crossing: Crossing, speed: number): void {
  crossing.x += Math.cos(crossing.heading) * speed * STEP_S;
  crossing.y += Math.sin(crossing.heading) * speed * STEP_S;
}

/** Returns whether a crossing's middle is farther than a margin off the field, so it is out of sight. */
export function hasLeft(
  crossing: Readonly<Crossing>,
  margin: number,
  torus: Torus,
): boolean {
  return (
    crossing.x < -margin ||
    crossing.x > torus.width + margin ||
    crossing.y < -margin ||
    crossing.y > torus.height + margin
  );
}

/**
 * Returns whether a crossing is within a reach of a place, the shortest way
 * across the wrap.
 *
 * Only a crossing with its middle on the field reaches anything: what it
 * meets is drawn across the wrap and it isn't, so off the field it would
 * reach what lies at the far edge, out of its sight.
 */
export function reaches(
  crossing: Readonly<Crossing>,
  to: Place,
  reach: number,
  torus: Torus,
): boolean {
  return (
    isOnField(crossing, torus) &&
    distanceSquared(torus, crossing.x, crossing.y, to.x, to.y) <= reach * reach
  );
}

/** Puts a crossing on its way at a place, heading a way, still a step ago. */
function place(
  crossing: Crossing,
  x: number,
  y: number,
  heading: number,
): void {
  crossing.live = true;
  crossing.x = x;
  crossing.y = y;
  crossing.heading = heading;
  crossing.lastX = x;
  crossing.lastY = y;
}

/** Returns whether a crossing's middle is on the field, between its edges. */
function isOnField(crossing: Readonly<Crossing>, torus: Torus): boolean {
  return (
    crossing.x >= 0 &&
    crossing.x < torus.width &&
    crossing.y >= 0 &&
    crossing.y < torus.height
  );
}
