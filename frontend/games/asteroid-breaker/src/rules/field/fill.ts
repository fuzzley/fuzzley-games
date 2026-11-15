// A wave's counts are written for a field of 40 by 40, and a field of
// another shape holds more of everything by its area: its rocks, the cap
// on them, its last few rocks, the pickups floating at once, the strays,
// the burrs and how many are adrift at once; comets come more often by the
// square root of it, as each crosses a longer field.

import { type Torus, across, wrap } from "../torus";
import {
  BURRS_AT_ONCE,
  FIELD_SHORT_SIDE,
  LAST_FEW,
  PICKUPS_AT_ONCE,
  ROCK_CAP,
  type Span,
} from "../tuning";
import type { Wave, WaveRocks } from "../waves/waves";

/** Describes how a wave fills a field of its shape. */
export interface Fill {
  /** The wave's rocks, by kind, size and count, each count grown for the field. */
  readonly rocks: readonly WaveRocks[];
  /** The most rocks the field holds at once. */
  readonly cap: number;
  /** How many whole rocks, or fewer, are its wave's last few (`lastFewOn()`). */
  readonly lastFew: number;
  /** How many pickups may float before chance lets no more go. */
  readonly pickupsAtOnce: number;
  readonly strays: number;
  readonly burrs: number;
  /** How many burrs may be adrift at once. */
  readonly burrsAtOnce: number;
  /** The time from one comet to the next, in milliseconds, or null for a wave without comets. */
  readonly cometEvery: Span | null;
}

/**
 * Describes what of the field a stretch moves: its size, and every place on
 * it, the ship's, the line in tow's, the shots', the rocks', the pickups',
 * the sparks', the stray's, the crew knocked loose's, the comets' and the
 * burrs'.
 */
export interface StretchField {
  torus: Torus;
  readonly ship: Stretched | null;
  readonly tow: readonly Stretched[];
  readonly shots: { readonly slots: readonly Stretched[] };
  readonly rocks: readonly Stretched[];
  readonly pickups: readonly Stretched[];
  readonly sparks: readonly Stretched[];
  readonly strays: { readonly adrift: Stretched };
  readonly loose: readonly Stretched[];
  readonly comets: { readonly slots: readonly Stretched[] };
  readonly burrs: { readonly slots: readonly StretchedBurr[] };
}

/** Describes a place on the field and where it was a step ago, which a stretch moves. */
interface Stretched {
  x: number;
  y: number;
  lastX: number;
  lastY: number;
}

/** Describes a burr's place, and whether it wraps or comes in still, which a stretch moves as either. */
interface StretchedBurr extends Stretched {
  readonly wraps: boolean;
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
    lastFew: lastFewOn(torus),
    pickupsAtOnce: grown(PICKUPS_AT_ONCE, share),
    strays: grown(wave.strays, share),
    burrs: grown(wave.burrs, share),
    burrsAtOnce: grown(BURRS_AT_ONCE, share),
    cometEvery: every && {
      least: every.least / sooner,
      most: every.most / sooner,
    },
  };
}

/**
 * Returns how many whole rocks a field of a shape has left, or fewer, as a
 * wave's last few: {@link LAST_FEW} grown by its area, as a wave's counts
 * are.
 */
export function lastFewOn(torus: Torus): number {
  return grown(LAST_FEW, areaShare(torus));
}

/**
 * Stretches a field to a new shape, as a pause lets the room change: every
 * place on it moves to the same share of the way across and down, but the
 * line in tow, which moves with the ship and keeps its shape, a stray, a
 * comet or a burr off the field keeping as far off it, nothing is added or
 * taken away, and nothing's speed changes.
 *
 * The mouse's aim the ship holds is left as it is, as the view keeps the
 * place the mouse last pointed at through a stretch, so a still mouse
 * doesn't end a ship's wait.
 */
export function stretchField(field: StretchField, torus: Torus): void {
  const from = field.torus;
  const { ship } = field;
  const was = ship && {
    x: ship.x,
    y: ship.y,
    lastX: ship.lastX,
    lastY: ship.lastY,
  };
  const wrapping = [
    ...(ship ? [ship] : field.tow),
    ...field.shots.slots,
    ...field.rocks,
    ...field.pickups,
    ...field.sparks,
    ...field.loose,
    ...field.burrs.slots.filter((burr) => burr.wraps),
  ];
  for (const place of wrapping) {
    stretch(place, from, torus);
    place.x = wrap(place.x, torus.width);
    place.y = wrap(place.y, torus.height);
    place.lastX = wrap(place.lastX, torus.width);
    place.lastY = wrap(place.lastY, torus.height);
  }
  if (ship && was) {
    for (const link of field.tow) keepBehind(link, was, ship, from, torus);
  }
  // A stray, a comet and a burr coming in cross without wrapping, from off
  // the field.
  const crossing = [
    field.strays.adrift,
    ...field.comets.slots,
    ...field.burrs.slots.filter((burr) => !burr.wraps),
  ];
  for (const place of crossing) stretch(place, from, torus);
  field.torus = torus;
}

/**
 * Moves a link of the line in tow with its ship's stretch, as far from the
 * ship the short way across the wrap as it was, where it was a step ago
 * too, so the line keeps its shape and its links their length.
 */
function keepBehind(
  link: Stretched,
  was: Readonly<Stretched>,
  ship: Readonly<Stretched>,
  from: Torus,
  to: Torus,
): void {
  link.x = wrap(ship.x + across(was.x, link.x, from.width), to.width);
  link.y = wrap(ship.y + across(was.y, link.y, from.height), to.height);
  link.lastX = wrap(
    ship.lastX + across(was.lastX, link.lastX, from.width),
    to.width,
  );
  link.lastY = wrap(
    ship.lastY + across(was.lastY, link.lastY, from.height),
    to.height,
  );
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
