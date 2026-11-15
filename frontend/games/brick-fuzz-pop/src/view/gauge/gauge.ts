// Where the gauge over an aiming finger lies: the charge's five pips again,
// larger, on a plate in an arc over the touch, turned aside the least it
// must where the field's sides or its ceiling leave no room straight over
// it. Its measures are the finger's, in CSS pixels, not the field's, so it
// is the same size on every field.

import type { FieldMetrics, Place } from "../field/field_metrics";
import { itemAt } from "../items";

/** How far the gauge's pips lie from the touch, in CSS pixels: about 12 mm, clear of a thumb's tip. */
export const GAUGE_REACH_CSS_PX = 74;

/** How wide a pip of the gauge is, in CSS pixels: twice the meter's on a phone. */
export const GAUGE_PIP_CSS_PX = 13;

/** How near the field's side walls, its ceiling and its floor a pip's middle may come, in CSS pixels. */
const GAUGE_ROOM_CSS_PX = 16;

/**
 * How far either side of the field's middle a touch keeps the gauge turned
 * the way it last turned, in CSS pixels, so a finger held there, wavering
 * across the middle, doesn't swing it from one side to the other.
 */
const GAUGE_LEAN_CSS_PX = 16;

/** How far the first pip and the last lie either side of the middle one about the touch, in degrees. */
export const GAUGE_SPREAD_DEGREES = 44;

/**
 * Where each pip lies about the touch, in degrees clockwise from straight
 * over it, before the gauge turns, in the order they light: from the left,
 * as the meter's do.
 */
const GAUGE_DEGREES: readonly number[] = [
  -GAUGE_SPREAD_DEGREES,
  -GAUGE_SPREAD_DEGREES / 2,
  0,
  GAUGE_SPREAD_DEGREES / 2,
  GAUGE_SPREAD_DEGREES,
];

/**
 * How far the plate's middle lies from the touch, toward the middle pip, as
 * a share of the reach: halfway between the middle pip and the first and
 * the last, so a plate as wide all along its arc is framed about it in the
 * least room.
 */
export const GAUGE_PLATE_MIDDLE =
  (1 + Math.cos(radiansOf(GAUGE_SPREAD_DEGREES))) / 2;

/** The most the gauge turns from straight over the touch, in degrees: till it hangs under it. */
const MOST_TURN = 180;

/** Describes the field as the gauge keeps to it: its cells, from the ceiling to the floor, in device pixels, and the pixel ratio. */
export type GaugeField = Pick<
  FieldMetrics,
  "x" | "y" | "width" | "height" | "pixelRatio"
>;

/** Says where the gauge lies over a touch, in device pixels, as {@link gaugeOf} writes it in place. */
export interface GaugePlace {
  /** The plate's middle, which its frame is drawn about. */
  readonly plate: Place;
  /**
   * How far the gauge turns about the touch from straight over it, in whole
   * degrees clockwise down the screen, as an image's angle is: 0 where it
   * fits straight over the touch.
   *
   * The next call reads it as the way to keep turning a touch near the
   * field's middle, so a record handed a new finger's touch may lean the
   * way the last finger's turned, which near the middle fits as well.
   */
  turn: number;
  /** Each pip's middle, in the order they light. */
  readonly pips: readonly Place[];
}

/** Returns a record for {@link gaugeOf} to write the gauge's place into, made once and reused. */
export function createGaugePlace(): GaugePlace {
  return {
    plate: { x: 0, y: 0 },
    turn: 0,
    pips: GAUGE_DEGREES.map(() => ({ x: 0, y: 0 })),
  };
}

/**
 * Returns where the gauge lies over a touch at a place on the canvas, in
 * device pixels, written into the record a caller hands over: straight
 * over it where every pip lies inside the field and under its ceiling,
 * {@link GAUGE_ROOM_CSS_PX} clear of the side walls, the ceiling and the
 * floor; otherwise turned about it toward the field's middle by the least
 * whole degree that leaves them so, but for a touch within
 * {@link GAUGE_LEAN_CSS_PX} of the middle, the way the record last turned,
 * where that does as well.
 *
 * Where no turn leaves them so, in a corner of the field or off it, as
 * where a pull back drags onto the floor's band, it turns the least that
 * leaves the pip furthest from its room the nearest to it, which meets the
 * rule above where a turn first fits, so the gauge moves on smoothly as a
 * finger crosses that line.
 */
export function gaugeOf(
  field: GaugeField,
  x: number,
  y: number,
  into: GaugePlace,
): GaugePlace {
  const { pixelRatio } = field;
  const reach = GAUGE_REACH_CSS_PX * pixelRatio;
  const room = GAUGE_ROOM_CSS_PX * pixelRatio;
  const middleX = field.x + field.width / 2;
  const side = x > middleX ? -1 : 1;
  const lean =
    Math.abs(x - middleX) <= GAUGE_LEAN_CSS_PX * pixelRatio && into.turn !== 0
      ? Math.sign(into.turn)
      : side;
  let turn = leastShortTurn(field, x, y, reach, room, lean);
  const short = shortfall(field, x, y, reach, room, turn);
  if (lean !== side && short > 0) {
    const siding = leastShortTurn(field, x, y, reach, room, side);
    if (shortfall(field, x, y, reach, room, siding) < short) turn = siding;
  }
  const middle = GAUGE_PLATE_MIDDLE * reach;
  const turning = radiansOf(turn);
  into.plate.x = x + middle * Math.sin(turning);
  into.plate.y = y - middle * Math.cos(turning);
  into.turn = turn;
  let at = 0;
  for (const pip of into.pips) {
    const angle = radiansOf(itemAt(GAUGE_DEGREES, at) + turn);
    pip.x = x + reach * Math.sin(angle);
    pip.y = y - reach * Math.cos(angle);
    at++;
  }
  return into;
}

/**
 * Returns the least whole degree a gauge over a touch turns one way,
 * clockwise for 1 and the other way for -1, that leaves its pips the least
 * short of their room clear of the field's edges: the least that leaves
 * them all clear, where one does.
 */
function leastShortTurn(
  field: GaugeField,
  x: number,
  y: number,
  reach: number,
  room: number,
  toward: number,
): number {
  let least = Infinity;
  let best = 0;
  for (let degrees = 0; degrees <= MOST_TURN && least > 0; degrees++) {
    // Adding 0 turns -0, a turn of nothing the other way, into 0.
    const turn = toward * degrees + 0;
    const short = shortfall(field, x, y, reach, room, turn);
    if (short < least) {
      least = short;
      best = turn;
    }
  }
  return best;
}

/**
 * Returns how far the pip of a gauge over a touch, turned some degrees
 * clockwise, that lies furthest from its room clear of the field's edges
 * falls short of it, in device pixels: 0 where every pip lies inside the
 * field and under its ceiling, the room clear of each edge.
 */
function shortfall(
  field: GaugeField,
  x: number,
  y: number,
  reach: number,
  room: number,
  turn: number,
): number {
  let worst = 0;
  for (const degrees of GAUGE_DEGREES) {
    const angle = radiansOf(degrees + turn);
    const pipX = x + reach * Math.sin(angle);
    const pipY = y - reach * Math.cos(angle);
    worst = Math.max(
      worst,
      field.x + room - pipX,
      pipX - (field.x + field.width - room),
      field.y + room - pipY,
      pipY - (field.y + field.height - room),
    );
  }
  return worst;
}

/** Returns an angle in degrees in radians. */
function radiansOf(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
