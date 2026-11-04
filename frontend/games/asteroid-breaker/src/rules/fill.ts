// A wave's counts are written for a field of 40 by 40, and a field of
// another shape holds more of everything by its area: its rocks, the cap
// on them, the pickups floating at once and the strays, the first of which
// comes later by it, as its wave lasts longer; comets come more often by
// the square root of it, as each crosses a longer field.

import type { Field } from "./field";
import { type Torus, wrap } from "./torus";
import {
  FIELD_SHORT_SIDE,
  PICKUPS_AT_ONCE,
  ROCK_CAP,
  STRAY_FIRST_MS,
  type Span,
} from "./tuning";
import type { Wave, WaveRocks } from "./waves";

/** Describes how a wave fills a field of its shape. */
export interface Fill {
  /** The wave's rocks, by kind, size and count, each count grown for the field. */
  readonly rocks: readonly WaveRocks[];
  /** The most rocks the field holds at once. */
  readonly cap: number;
  /** How many pickups may float before chance lets no more go. */
  readonly pickupsAtOnce: number;
  readonly strays: number;
  /** How far into the wave its first stray comes, in milliseconds. */
  readonly strayFirstMs: number;
  /** The time from one comet to the next, in milliseconds, or null for a wave without comets. */
  readonly cometEvery: Span | null;
}

/** The area a wave's counts are written for, a field of 40 by 40. */
const WRITTEN_AREA = FIELD_SHORT_SIDE * FIELD_SHORT_SIDE;

/** Returns how many times the area a wave's counts are written for a field's is. */
export function areaShare(torus: Torus): number {
  return (torus.width * torus.height) / WRITTEN_AREA;
}

/**
 * Returns how a wave fills a field of a shape: each count grown by the
 * field's area, rounded to the nearest, which a field never smaller than
 * 40 by 40 keeps never fewer than written, and the cap never fewer than
 * the rocks it lays.
 */
export function fillFor(wave: Wave, torus: Torus): Fill {
  const share = areaShare(torus);
  const rocks = wave.rocks.map((each) => ({
    ...each,
    count: grown(each.count, share),
  }));
  const laid = rocks.reduce((sum, each) => sum + each.count, 0);
  const every = wave.cometEvery;
  const sooner = Math.sqrt(share);
  return {
    rocks,
    cap: Math.max(laid, Math.floor(ROCK_CAP * share)),
    pickupsAtOnce: grown(PICKUPS_AT_ONCE, share),
    strays: grown(wave.strays, share),
    strayFirstMs: STRAY_FIRST_MS * share,
    cometEvery: every && {
      least: every.least / sooner,
      most: every.most / sooner,
    },
  };
}

/**
 * Stretches a field to a new shape, as a pause lets the room change: every
 * place on it moves to the same share of the way across and down, a stray
 * or a comet off the field keeping as far off it, nothing is added or
 * taken away, and nothing's speed changes.
 *
 * The mouse's aim the ship holds is left as it is, as the view keeps the
 * place the mouse last pointed at through a stretch, so a still mouse
 * doesn't end a ship's wait.
 */
export function stretchField(field: Field, torus: Torus): void {
  const from = field.torus;
  const wrapping = [
    ...(field.ship ? [field.ship] : []),
    ...field.shots.slots,
    ...field.rocks,
    ...field.pickups,
  ];
  for (const place of wrapping) {
    stretch(place, from, torus);
    place.x = wrap(place.x, torus.width);
    place.y = wrap(place.y, torus.height);
    place.lastX = wrap(place.lastX, torus.width);
    place.lastY = wrap(place.lastY, torus.height);
  }
  // A stray and a comet cross without wrapping, from off the field.
  for (const place of [field.strays.adrift, ...field.comets.slots]) {
    stretch(place, from, torus);
  }
  field.torus = torus;
}

/** Describes a place on the field and where it was a step ago, which a stretch moves. */
interface Stretched {
  x: number;
  y: number;
  lastX: number;
  lastY: number;
}

/** Moves a place and where it was a step ago by a stretch from one shape to another. */
function stretch(place: Stretched, from: Torus, to: Torus): void {
  place.x = stretchAlong(place.x, from.width, to.width);
  place.y = stretchAlong(place.y, from.height, to.height);
  place.lastX = stretchAlong(place.lastX, from.width, to.width);
  place.lastY = stretchAlong(place.lastY, from.height, to.height);
}

/**
 * Returns a place along a side stretched from one length to another: the
 * same share of the way along it, or, off it, as far off it, so a crossing
 * waiting off an edge comes in as it would have.
 */
function stretchAlong(at: number, from: number, to: number): number {
  if (at < 0) return at;
  if (at > from) return to + (at - from);
  return (at * to) / from;
}

/** Returns a count grown by a share of area, rounded to the nearest. */
function grown(count: number, share: number): number {
  return Math.round(count * share);
}
